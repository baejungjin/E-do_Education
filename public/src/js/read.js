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

    // --- 상태 및 설정 변수 ---
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
    let lastVoiceTime = 0;
    let silenceTimeout = null;

    // --- 초기화 ---
    async function initialize() {
        fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color: red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        judgeSkipToQuizBtn.href = `problemsolve.html?fileId=${fileId}`;
        doneBtn.addEventListener('click', () => { window.location.href = `problemsolve.html?fileId=${fileId}`; });

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            updateFeedbackMessage('마이크 권한이 거부되었습니다.');
            micBtn.style.backgroundColor = '#E0E0E0';
            return;
        }

        try {
            passageDisplay.innerHTML = '<p>지문을 불러오는 중입니다...</p>';
            const response = await fetch(`${BASE_URL}/api/ocr`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ fileId }) 
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '텍스트를 불러오지 못했습니다.');
            const rawText = result.fullText || result.preview || "";
            const text = normalizeOcrLineBreaks(rawText);
            setupSentences(text);

            prefetchQuiz(fileId).catch(() => {});
        } catch (error) {
            passageDisplay.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    }

    function setupSentences(text) {
        sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
        currentIndex = -1;
        passageDisplay.innerHTML = '';
        sentences.forEach(sentenceText => {
            const cleaned = sentenceText
                .replace(/\s{2,}/g, ' ')
                .replace(/\s+([.,!?;:])/g, '$1')
                .replace(/([가-힣A-Za-z])\s+([가-힣A-Za-z])/g, '$1 $2')
                .trim();
            const sentenceEl = document.createElement('span');
            sentenceEl.className = 'sentence';
            sentenceEl.textContent = cleaned;
            passageDisplay.appendChild(sentenceEl);
        });
        showStartPrompt();
        micBtn.addEventListener('click', toggleRecording);
        retryBtn.addEventListener('click', () => {
            if (isRecording) stopRecording();
            setTimeout(() => startRecording(), 500);
        });
        closeBtn.addEventListener('click', goBackToMain);
    }

    function normalizeOcrLineBreaks(raw) {
        if (!raw) return '';
        const unified = raw.replace(/\r/g, '');
        const paragraphs = unified
            .split(/\n{2,}/)
            .map(p => p.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim())
            .filter(Boolean);
        return paragraphs.join('\n\n');
    }

    function updateFeedbackMessage(message) {
        if (feedbackMessage) feedbackMessage.textContent = message;
    }

    function updateVoiceText(text) {
        if (voiceText) {
            voiceText.textContent = text || '음성을 인식하면 여기에 텍스트가 표시됩니다.';
            voiceText.scrollTop = voiceText.scrollHeight;
            if (text && text.length > 0) {
                voiceText.style.opacity = '0.8';
                setTimeout(() => {
                    if (voiceText) voiceText.style.opacity = '1';
                }, 100);
            }
        }
    }

    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            updateFeedbackMessage("모든 문장을 다 읽었어요!");
            return;
        }
        currentIndex++;
        sentencePassed = false;
        updateSentenceStyles();
        accumulatedText = '';
        lastVoiceTime = 0;
        updateVoiceText("음성을 인식하면 여기에 텍스트가 표시됩니다.");
        updateFeedbackMessage("마이크를 눌러서 읽기를 시작하세요");
    }

    async function prefetchQuiz(fileId) {
        try {
            const payload = { fileId, level: '초급', style: '지문 이해' };
            const res = await fetch(`${BASE_URL}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.ok || !Array.isArray(data.questions) || data.questions.length === 0) return;
            const cache = { fileId, questions: data.questions, ts: Date.now() };
            sessionStorage.setItem(`quizCache:${fileId}`, JSON.stringify(cache));
        } catch (e) {}
    }

    function updateSentenceStyles() {
        passageDisplay.querySelectorAll('.sentence').forEach((el, index) => {
            el.classList.remove('current', 'previous', 'visible');
            if (index < currentIndex) el.classList.add('previous', 'visible');
            else if (index === currentIndex) el.classList.add('current', 'visible');
        });
        const currentSentence = passageDisplay.querySelector('.sentence.current');
        if (currentSentence) currentSentence.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function ensureStartStyles() {
        if (document.getElementById('start-prompt-style')) return;
        const style = document.createElement('style');
        style.id = 'start-prompt-style';
        style.textContent = `
        .start-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;justify-content:center;align-items:center;z-index:9998}
        .start-card{background:#fff;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.15);padding:32px 28px;width:min(600px,92%);text-align:left;font-family:Pretendard,system-ui,sans-serif}
        .start-title{font-size:24px;font-weight:700;color:#333;margin:0 0 20px 0;text-align:center}
        .instruction-list{list-style:none;padding:0;margin:0 0 16px 0}
        .instruction-list li{font-size:14px;color:#555;margin:0 0 8px 0;padding:4px 0;line-height:1.4}
        .start-btn{display:block;background:#42A5F5;color:#fff;border:none;border-radius:14px;padding:14px 24px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(66,165,245,0.3);margin:0 auto;font-size:16px}
        .start-btn:hover{background:#1E88E5;transform:translateY(-1px)}
        `;
        document.head.appendChild(style);
    }

    function showStartPrompt() {
        ensureStartStyles();
        const overlay = document.createElement('div');
        overlay.className = 'start-overlay';
        overlay.innerHTML = `
            <div class="start-card">
                <h3 class="start-title">지문 읽기 안내</h3>
                <ul class="instruction-list">
                    <li>🎤 <strong>마이크 버튼</strong>을 눌러서 읽기를 시작하세요</li>
                    <li>📝 문장을 <strong>소리내어 읽어주세요</strong></li>
                    <li>⏸️ 중간에 멈춰도 괜찮아요</li>
                    <li>✅ 다 읽으면 <strong>다음 문장</strong>으로 넘어갑니다</li>
                </ul>
                <button class="start-btn">시작하기</button>
            </div>
        `;
        document.body.appendChild(overlay);
        const startBtn = overlay.querySelector('.start-btn');
        startBtn.addEventListener('click', () => {
            overlay.remove();
            showNextSentence();
        });
    }

    // --- 녹음 및 STT 로직 ---
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
            if (accumulatedText.length > 0) checkSimilarity(accumulatedText);
        } else startRecording();
    }

    function startRecording() {
        if (!mediaStream) return;
        if (socket) {
            try { if (socket.readyState === WebSocket.OPEN) socket.close(1000, '새 연결'); } catch {}
            socket = null;
        }
        isRecording = true;
        micBtn.classList.add('recording');
        recordingAnimation.classList.add('active');
        updateFeedbackMessage("읽는 중...");
        retryBtn.classList.remove('active');
        accumulatedText = '';
        updateVoiceText("음성을 인식하는 중...");

        if (silenceTimeout) clearTimeout(silenceTimeout);
        socket = new WebSocket(STT_URL);

        socket.onopen = () => {
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm', audioBitsPerSecond: 128000 });
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(event.data);
            };
            mediaRecorder.start(1000);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript') {
                    if (data.final && data.text?.trim()) {
                        accumulatedText += ' ' + data.text.trim(); // ✅ 덮어쓰기 대신 누적
                        updateVoiceText(accumulatedText.trim());
                    } else if (data.text?.trim()) {
                        // 중간 결과는 임시 표시용
                        updateVoiceText((accumulatedText + ' ' + data.text.trim()).trim());
                    }

                    if (silenceTimeout) clearTimeout(silenceTimeout);
                    silenceTimeout = setTimeout(() => {
                        if (isRecording && accumulatedText.length > 0) {
                            console.log('침묵 감지 - 녹음 유지');
                        }
                    }, 8000); // ✅ 완화됨 (3초 → 8초)
                }
            } catch (error) {
                console.error('WebSocket 메시지 오류:', error);
            }
        };

        socket.onerror = () => onRecordingFail("서버 연결에 실패했습니다.");
        socket.onclose = (e) => console.log('WebSocket 종료:', e.code, e.reason);

        heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN && isRecording) {
                socket.send(JSON.stringify({ type: 'heartbeat' }));
            } else {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
        }, 10000);
    }

    function stopRecording() {
        isRecording = false;
        micBtn.classList.remove('recording');
        recordingAnimation.classList.remove('active');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (silenceTimeout) clearTimeout(silenceTimeout);
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            try { mediaRecorder.stop(); } catch {}
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            try { socket.close(1000, '정상 종료'); } catch {}
        }
        socket = null;
        if (sentencePassed) updateFeedbackMessage("잘했어요! 👏");
        else updateFeedbackMessage("다시 시도하기 버튼을 눌러주세요");
    }

    function normalizeText(text) {
        return (text || '').toLowerCase().replace(/\s+/g, '').replace(/[.,!?"'`~:;\-()[\]{}…·]/g, '').replace(/\u200B/g, '');
    }

    function levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m === 0) return n; if (n === 0) return m;
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
        const dist = levenshtein(a, b);
        return 1 - dist / maxLen;
    }

    function isSentenceComplete(original, spoken) {
        if (spoken.length < 3) {
            onRecordingFail("조금 더 길게 읽어주세요");
            return false;
        }
        const lengthRatio = spoken.length / original.length;
        if (lengthRatio < 0.6) {
            onRecordingFail("문장을 끝까지 읽어주세요");
            return false;
        }
        return true;
    }

    function checkSimilarity(transcribedText) {
        const originalSentence = sentences[currentIndex].trim();
        const normOriginal = normalizeText(originalSentence);
        const normSpoken = normalizeText(transcribedText);
        if (!isSentenceComplete(normOriginal, normSpoken)) return;

        const ratio = similarityRatio(normOriginal, normSpoken);
        const containsPrefix = normOriginal.includes(normSpoken.slice(0, 4));
        const pass = ratio >= 0.6 || containsPrefix;

        if (pass) {
            updateFeedbackMessage("잘했어요! 👏");
            sentencePassed = true;
            stopRecording();
            if (currentIndex === sentences.length - 1) doneBtn.disabled = false;
            else setTimeout(() => showNextSentence(), 2000);
        } else onRecordingFail("조금 다른 것 같아요. 다시 시도해볼까요?");
    }

    function onRecordingFail(message) {
        feedbackMessage.innerHTML = `😢 ${message}`;
        retryBtn.classList.add('active');
        updateVoiceText("인식 실패 - 다시 시도해주세요");
    }

    function goBackToMain() {
        if (isRecording) stopRecording();
        window.location.href = 'main.html';
    }

    initialize();
});