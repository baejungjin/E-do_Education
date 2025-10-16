document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const micBtn = document.getElementById('mic-btn');
    const recordingAnimation = document.getElementById('recording-animation');
    const feedbackMessage = document.getElementById('feedback-message');
    const retryBtn = document.getElementById('retry-btn');
    const doneBtn = document.getElementById('done-btn');
    const voiceText = document.getElementById('voice-text');
    const judgeSkipToQuizBtn = document.getElementById('judge-skip-to-quiz-btn');
    const closeBtn = document.getElementById('close-btn');

    // --- 상태 변수 --- //
    const BASE_URL = 'https://e-do.onrender.com';
    const STT_URL = 'wss://e-do.onrender.com/stt';
    let sentences = [];
    let currentIndex = -1;
    let sentencePassed = false;
    let isRecording = false;
    let socket;
    let mediaRecorder;
    let mediaStream;
    let fileId = null;
    let heartbeatInterval = null;
    let accumulatedText = '';
    let silenceTimeout = null;

    // --- 초기화 --- //
    async function initialize() {
        fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color:red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        judgeSkipToQuizBtn.href = `problemsolve.html?fileId=${fileId}`;
        doneBtn.addEventListener('click', () => { window.location.href = `problemsolve.html?fileId=${fileId}`; });

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            updateFeedbackMessage('마이크 권한이 거부되었습니다.');
            micBtn.style.backgroundColor = '#E0E0E0';
            return;
        }

        try {
            passageDisplay.innerHTML = '<p>지문을 불러오는 중입니다...</p>';
            const res = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || '텍스트를 불러오지 못했습니다.');
            const text = normalizeOcrLineBreaks(data.fullText || data.preview || "");
            setupSentences(text);
            prefetchQuiz(fileId).catch(() => {});
        } catch (e) {
            passageDisplay.innerHTML = `<p style="color:red;">오류: ${e.message}</p>`;
        }
    }

    function normalizeOcrLineBreaks(raw) {
        return raw.replace(/\r/g, '').split(/\n{2,}/)
            .map(p => p.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim())
            .filter(Boolean).join('\n\n');
    }

    function setupSentences(text) {
        sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
        currentIndex = -1;
        passageDisplay.innerHTML = '';
        sentences.forEach(s => {
            const cleaned = s.replace(/\s{2,}/g, ' ')
                .replace(/\s+([.,!?;:])/g, '$1')
                .replace(/([가-힣A-Za-z])\s+([가-힣A-Za-z])/g, '$1 $2').trim();
            const el = document.createElement('span');
            el.className = 'sentence';
            el.textContent = cleaned;
            passageDisplay.appendChild(el);
        });

        micBtn.addEventListener('click', toggleRecording);
        retryBtn.addEventListener('click', () => {
            if (isRecording) stopRecording();
            setTimeout(() => startRecording(), 300);
        });
        closeBtn.addEventListener('click', goBackToMain);
        showStartPrompt();
    }

    function showStartPrompt() {
        const overlay = document.createElement('div');
        overlay.className = 'start-overlay';
        overlay.innerHTML = `
            <div class="start-card">
                <h3 class="start-title">지문 읽기 안내</h3>
                <ul class="instruction-list">
                    <li>🎤 마이크 버튼을 눌러서 읽기를 시작하세요.</li>
                    <li>🗣 천천히, 또박또박 읽어주세요.</li>
                    <li>⏸ 3초 이상 멈추면 자동으로 다음 문장으로 넘어갑니다.</li>
                    <li>✅ 자동 인식이 안 될 경우, 다시 눌러 수동으로 평가할 수 있습니다.</li>
                </ul>
                <button class="start-btn">시작하기</button>
            </div>`;
        document.body.appendChild(overlay);
        const style = document.createElement('style');
        style.textContent = `
        .start-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;justify-content:center;align-items:center;z-index:9999}
        .start-card{background:#fff;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.15);padding:32px;width:min(600px,90%);font-family:Pretendard}
        .start-title{text-align:center;font-size:22px;font-weight:700;margin-bottom:16px}
        .instruction-list{list-style:none;padding:0;margin:0;font-size:15px;color:#555}
        .instruction-list li{margin-bottom:8px}
        .start-btn{display:block;margin:20px auto 0;background:#42A5F5;color:#fff;font-weight:700;border:none;padding:12px 20px;border-radius:14px;cursor:pointer;}
        `;
        document.head.appendChild(style);

        overlay.querySelector('.start-btn').addEventListener('click', () => {
            overlay.remove();
            showNextSentence();
        });
    }

    function updateFeedbackMessage(msg) { feedbackMessage.textContent = msg; }

    function updateVoiceText(text) {
        voiceText.textContent = text || '음성을 인식하면 여기에 텍스트가 표시됩니다.';
        voiceText.scrollTop = voiceText.scrollHeight;
    }

    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            updateFeedbackMessage("모든 문장을 다 읽었어요!");
            return;
        }
        currentIndex++;
        sentencePassed = false;
        accumulatedText = '';
        updateVoiceText('');
        updateFeedbackMessage("마이크를 눌러서 읽기를 시작하세요.");
        updateSentenceStyles();
    }

    function updateSentenceStyles() {
        passageDisplay.querySelectorAll('.sentence').forEach((el, i) => {
            el.classList.remove('current', 'previous', 'visible');
            if (i < currentIndex) el.classList.add('previous', 'visible');
            else if (i === currentIndex) el.classList.add('current', 'visible');
        });
        const current = passageDisplay.querySelector('.sentence.current');
        if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function toggleRecording() {
        if (isRecording) {
            stopRecording();
            if (accumulatedText.length > 0) checkSimilarity(accumulatedText);
        } else startRecording();
    }

    function startRecording() {
        if (!mediaStream) return;

        if (socket && socket.readyState === WebSocket.OPEN) socket.close(1000, '새 연결');
        isRecording = true;
        micBtn.classList.add('recording');
        recordingAnimation.classList.add('active');
        updateFeedbackMessage("읽는 중...");
        accumulatedText = '';
        updateVoiceText("음성을 인식하는 중...");

        socket = new WebSocket(STT_URL);

        socket.onopen = () => {
            mediaRecorder = new MediaRecorder(mediaStream, {
                mimeType: 'audio/webm',
                audioBitsPerSecond: 128000
            });
            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(e.data);
                }
            };
            // ✅ 반응속도 개선 (1초 → 0.3초)
            mediaRecorder.start(300);
        };

        socket.onmessage = e => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'transcript' && data.text?.trim()) {
                    // --- 실시간 표시 ---
                    if (!data.final) {
                        updateVoiceText((accumulatedText + ' ' + data.text.trim()).trim());
                    } else {
                        accumulatedText += ' ' + data.text.trim();
                        updateVoiceText(accumulatedText.trim());
                    }

                    // --- 침묵 감지 후 자동 판정 (3초 + 80% 이상) ---
                    if (silenceTimeout) clearTimeout(silenceTimeout);
                    silenceTimeout = setTimeout(() => {
                        if (isRecording && accumulatedText.length > 0) {
                            const original = sentences[currentIndex].trim();
                            const lengthRatio = accumulatedText.length / original.length;
                            if (lengthRatio >= 0.8) { // ✅ 80% 이상 읽었을 때 자동 평가
                                stopRecording();
                                checkSimilarity(accumulatedText.trim());
                            }
                        }
                    }, 3000);
                }
            } catch (err) {
                console.error('STT 메시지 오류:', err);
            }
        };

        socket.onerror = () => onRecordingFail("서버 연결 실패");
        socket.onclose = () => console.log("WebSocket 연결 종료");

        heartbeatInterval = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN && isRecording)
                socket.send(JSON.stringify({ type: 'heartbeat' }));
        }, 10000);
    }

    function stopRecording() {
        isRecording = false;
        micBtn.classList.remove('recording');
        recordingAnimation.classList.remove('active');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (silenceTimeout) clearTimeout(silenceTimeout);
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        if (socket && socket.readyState === WebSocket.OPEN) socket.close(1000, '정상 종료');
        socket = null;
        updateFeedbackMessage(sentencePassed ? "잘했어요! 👏" : "다시 시도하기 버튼을 눌러주세요");
    }

    function normalizeText(t) {
        return (t || '').toLowerCase().replace(/\s+/g, '')
            .replace(/[.,!?"'`~:;\-()[\]{}…·]/g, '').replace(/\u200B/g, '');
    }

    function levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m * n === 0) return Math.max(m, n);
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }

    function similarityRatio(a, b) {
        const maxLen = Math.max(a.length, b.length) || 1;
        return 1 - levenshtein(a, b) / maxLen;
    }

    function isSentenceComplete(original, spoken) {
        const ratio = spoken.length / original.length;
        if (ratio < 0.8) { // ✅ 80% 기준 유지
            onRecordingFail("문장을 거의 끝까지 읽어주세요.");
            return false;
        }
        return true;
    }

    function checkSimilarity(transcribedText) {
        const original = sentences[currentIndex].trim();
        const normO = normalizeText(original);
        const normS = normalizeText(transcribedText);
        if (!isSentenceComplete(normO, normS)) return;
        const ratio = similarityRatio(normO, normS);
        const pass = ratio >= 0.6;
        if (pass) {
            updateFeedbackMessage("잘했어요! 👏");
            sentencePassed = true;
            if (currentIndex === sentences.length - 1) doneBtn.disabled = false;
            else setTimeout(showNextSentence, 1500);
        } else onRecordingFail("조금 다른 것 같아요. 다시 시도해볼까요?");
    }

    function onRecordingFail(msg) {
        feedbackMessage.textContent = `😢 ${msg}`;
        retryBtn.classList.add('active');
        updateVoiceText("인식 실패 - 다시 시도해주세요");
    }

    function goBackToMain() {
        if (isRecording) stopRecording();
        window.location.href = 'main.html';
    }

    async function prefetchQuiz(fileId) {
        try {
            const res = await fetch(`${BASE_URL}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, level: '초급', style: '지문 이해' })
            });
            const data = await res.json();
            if (data.ok && Array.isArray(data.questions))
                sessionStorage.setItem(`quizCache:${fileId}`, JSON.stringify({ fileId, ...data }));
        } catch {}
    }

    initialize();
});
