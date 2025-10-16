document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const nextSentenceBtn = document.getElementById('next-sentence-btn');
    const micBtn = document.getElementById('mic-btn');
    const recordingAnimation = document.getElementById('recording-animation');
    const feedbackMessage = document.getElementById('feedback-message');
    const retryBtn = document.getElementById('retry-btn');
    const doneBtn = document.getElementById('done-btn');
    const voiceText = document.getElementById('voice-text');
    const restartReadingBtn = document.getElementById('restart-reading-btn');
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
    let recordingTimeout = null;
    let heartbeatInterval = null;

    // --- 초기화 ---
    async function initialize() {
        fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color: red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        // 심사위원용 버튼 링크 설정
        judgeSkipToQuizBtn.href = `problemsolve.html?fileId=${fileId}`;
        doneBtn.addEventListener('click', () => { window.location.href = `problemsolve.html?fileId=${fileId}`; });

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            feedbackMessage.textContent = '마이크 권한이 거부되었습니다.';
            micBtn.style.backgroundColor = '#E0E0E0';
            return;
        }

        try {
            passageDisplay.innerHTML = '<p>지문을 불러오는 중입니다...</p>';
            const response = await fetch(`${BASE_URL}/api/ocr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }) });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '텍스트를 불러오지 못했습니다.');
            // 명세서에 따르면 fullText가 없을 수 있어 preview로 폴백
            const rawText = result.fullText || result.preview || "";
            const text = normalizeOcrLineBreaks(rawText);
            setupSentences(text);

            // 퀴즈를 미리 받아서 캐시(세션)해 UX 향상
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
            // 의미 없는 띄어쓰기 제거(여러 공백, 문장부호 앞 공백, 한글/영문 사이 과도 공백)
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
        // 시작 전 안내를 보여주고, 사용자가 시작을 누르면 첫 문장을 진행
        showStartPrompt();
        nextSentenceBtn.disabled = true;
        nextSentenceBtn.addEventListener('click', showNextSentence);
        micBtn.addEventListener('click', toggleRecording);
        retryBtn.addEventListener('click', () => startRecording());
        restartReadingBtn.addEventListener('click', restartReading);
        closeBtn.addEventListener('click', goBackToMain);
    }
    // --- OCR 줄바꿈 정규화 ---
    function normalizeOcrLineBreaks(raw) {
        if (!raw) return '';
        const unified = raw.replace(/\r/g, '');
        // 두 줄 이상 공백은 문단 경계로, 단일 개행은 공백으로 치환
        const paragraphs = unified
            .split(/\n{2,}/)
            .map(p => p.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim())
            .filter(Boolean);
        return paragraphs.join('\n\n');
    }

    // --- 음성인식 텍스트 업데이트 ---
    function updateVoiceText(text) {
        if (voiceText) {
            voiceText.textContent = text || '음성을 인식하면 여기에 텍스트가 표시됩니다.';
        }
    }


    // --- 문장 표시 로직 ---
    function showNextSentence() {
        // 다음 문장으로 이동 (처음 호출 포함)
        if (currentIndex >= sentences.length - 1) {
            nextSentenceBtn.textContent = "모든 문장을 다 읽었어요!";
            nextSentenceBtn.disabled = true;
            return;
        }
        currentIndex++;
        sentencePassed = false;
        updateSentenceStyles();
        // 새 문장 시작 시 다음 버튼은 비활성화하고 자동 녹음 시작
        nextSentenceBtn.disabled = true;
        feedbackMessage.textContent = "마이크를 눌러 녹음을 시작하세요";
        startRecording();
    }

    // --- 퀴즈 프리페치 & 캐시 ---
    async function prefetchQuiz(fileId) {
        try {
            const payload = { fileId, level: '초급', style: '지문 이해' };
            const res = await fetch(`${BASE_URL}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
                return;
            }
            const cache = { fileId, questions: data.questions, ts: Date.now() };
            sessionStorage.setItem(`quizCache:${fileId}`, JSON.stringify(cache));
        } catch (e) {
            // 네트워크 실패는 무시 (문제 페이지에서 재시도)
        }
    }

    function updateSentenceStyles() {
        passageDisplay.querySelectorAll('.sentence').forEach((el, index) => {
            el.classList.remove('current', 'previous', 'visible');
            if (index < currentIndex) el.classList.add('previous', 'visible');
            else if (index === currentIndex) el.classList.add('current', 'visible');
        });
        
        // 현재 문장으로 자동 스크롤
        const currentSentence = passageDisplay.querySelector('.sentence.current');
        if (currentSentence) {
            currentSentence.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    // --- 시작 안내 오버레이 ---
    function ensureStartStyles() {
        if (document.getElementById('start-prompt-style')) return;
        const style = document.createElement('style');
        style.id = 'start-prompt-style';
        style.textContent = `
        .start-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;justify-content:center;align-items:center;z-index:9998}
        .start-card{background:#fff;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.15);padding:28px 24px;width:min(520px,92%);text-align:center;font-family:Pretendard,system-ui,sans-serif}
        .start-title{font-size:22px;font-weight:700;color:#333;margin:0 0 8px 0}
        .start-sub{font-size:15px;color:#666;margin:0 0 18px 0}
        .start-btn{display:inline-block;background:#42A5F5;color:#fff;border:none;border-radius:14px;padding:12px 20px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(66,165,245,0.3);}
        .start-btn:hover{background:#1E88E5}
        `;
        document.head.appendChild(style);
    }

    function showStartPrompt() {
        ensureStartStyles();
        const overlay = document.createElement('div');
        overlay.className = 'start-overlay';
        overlay.innerHTML = `
            <div class="start-card">
                <h3 class="start-title">읽기를 시작해볼까요?</h3>
                <p class="start-sub">버튼을 누르면 첫 문장이 표시되고 녹음이 시작돼요.</p>
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

    // --- 녹음 및 STT 로직 (수동 시작/종료) ---
    function toggleRecording() {
        if (isRecording) {
            // 문장이 성공적으로 읽힌 상태라면 다음 문장으로 넘어가기
            if (sentencePassed) {
                stopRecording();
                showNextSentence();
            } else {
                // 아직 성공하지 못한 상태라면 녹음만 중지
                stopRecording();
            }
        } else {
            startRecording();
        }
    }

    function startRecording() {
        if (!mediaStream) return;
        
        // 기존 연결이 있으면 정리
        if (socket) {
            try {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close(1000, '새 연결을 위해 종료');
                }
            } catch (error) {
                console.error('기존 WebSocket 종료 오류:', error);
            }
            socket = null;
        }
        
        isRecording = true;
        micBtn.classList.add('recording');
        recordingAnimation.classList.add('active');
        feedbackMessage.textContent = "읽고 나서 마이크 버튼을 다시 눌러주세요";
        retryBtn.classList.remove('active');
        
        // 음성인식 텍스트 초기화
        updateVoiceText("음성을 인식하는 중...");

        // 기존 타임아웃 클리어
        if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            recordingTimeout = null;
        }

        socket = new WebSocket(STT_URL);
        socket.onopen = () => {
            mediaRecorder = new MediaRecorder(mediaStream, { 
                mimeType: 'audio/webm',
                audioBitsPerSecond: 128000
            });
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'stop' }));
                }
            };
            // 2초 간격으로 데이터 전송하여 긴 공백 허용
            mediaRecorder.start(2000);
        };
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript' && data.final) {
                    updateVoiceText(data.text);
                    checkSimilarity(data.text);
                } else if (data.type === 'transcript') {
                    // 실시간 중간 결과 표시
                    updateVoiceText(data.text);
                }
            } catch (error) {
                console.error('WebSocket 메시지 파싱 오류:', error);
            }
        };
        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            onRecordingFail("서버 연결에 실패했어요.");
        };
        socket.onclose = (event) => {
            console.log('WebSocket 연결 종료:', event.code, event.reason);
            if (isRecording && event.code !== 1000) {
                // 정상 종료가 아닌 경우 재연결 시도
                setTimeout(() => {
                    if (isRecording) {
                        console.log('WebSocket 재연결 시도...');
                        startRecording();
                    }
                }, 1000);
            }
        };
        
        // 60초 후 자동으로 녹음 중지 (타임아웃 방지) - 천천히 읽는 사람을 위해 연장
        recordingTimeout = setTimeout(() => {
            if (isRecording) {
                console.log('녹음 타임아웃 - 자동 중지');
                stopRecording();
            }
        }, 60000);
        
        // 연결 유지를 위한 heartbeat (10초마다)
        heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN && isRecording) {
                try {
                    socket.send(JSON.stringify({ type: 'heartbeat' }));
                } catch (error) {
                    console.error('Heartbeat 전송 오류:', error);
                }
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
        
        // 타임아웃 클리어
        if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            recordingTimeout = null;
        }
        
        // Heartbeat 클리어
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        
        // MediaRecorder 중지
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.error('MediaRecorder 중지 오류:', error);
            }
        }
        
        // WebSocket 연결 안전하게 종료
        if (socket) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.close(1000, '정상 종료');
                } catch (error) {
                    console.error('WebSocket 종료 오류:', error);
                }
            }
            socket = null;
        }
        
        // 문장이 성공적으로 읽힌 경우와 그렇지 않은 경우를 구분
        if (sentencePassed) {
            feedbackMessage.textContent = "잘했어요! 👏 마이크 버튼을 눌러서 다음 문장으로 넘어가세요";
        } else {
            feedbackMessage.textContent = "마이크를 눌러 녹음을 시작하세요";
        }
        updateVoiceText("음성을 인식하면 여기에 텍스트가 표시됩니다.");
    }

    // --- 텍스트 유사도 유틸(완화 기준) ---
    function normalizeText(text) {
        return (text || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[.,!?"'`~:;\-()[\]{}…·]/g, '')
            .replace(/\u200B/g, '');
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
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[m][n];
    }
    function similarityRatio(a, b) {
        const maxLen = Math.max(a.length, b.length) || 1;
        const dist = levenshtein(a, b);
        return 1 - dist / maxLen;
    }

    function checkSimilarity(transcribedText) {
        const originalSentence = sentences[currentIndex].trim();
        const normOriginal = normalizeText(originalSentence);
        const normSpoken = normalizeText(transcribedText);

        // 너무 짧은 인식은 노이즈로 간주
        if (normSpoken.length < 4) {
            onRecordingFail("조금 더 길게 읽어주세요");
            return;
        }

        const ratio = similarityRatio(normOriginal, normSpoken);
        const containsPrefix = normOriginal.includes(normSpoken.slice(0, 5));

        // 문장 길이에 따라 완화된 임계값 적용
        const isShortSentence = normOriginal.length < 12;
        const pass = ratio >= (isShortSentence ? 0.6 : 0.7) || containsPrefix;

        if (pass) {
            feedbackMessage.textContent = "잘했어요! 👏 마이크 버튼을 눌러서 다음 문장으로 넘어가세요";
            sentencePassed = true;
            // 현재 문장 성공 시 녹음은 계속 유지하고 사용자가 직접 종료하도록 함
            // 마지막 문장까지 성공하면 '다 읽었어요' 버튼 활성화
            if (currentIndex === sentences.length - 1) {
                doneBtn.disabled = false;
                nextSentenceBtn.disabled = true;
                restartReadingBtn.disabled = false; // 다시 읽기 버튼 활성화
            } else {
                // 다음 문장으로 넘어갈 수 있도록 버튼 활성화
                nextSentenceBtn.disabled = false;
                restartReadingBtn.disabled = false; // 다시 읽기 버튼 활성화
                // 자동으로 다음 문장으로 넘어가지 않음 - 사용자가 마이크 버튼을 눌러야 함
            }
        } else {
            onRecordingFail("조금 다른 것 같아요. 다시 시도해볼까요?");
        }
    }

    function onRecordingFail(message) {
        feedbackMessage.innerHTML = `😢 ${message}`;
        retryBtn.classList.add('active');
        updateVoiceText("인식 실패 - 다시 시도해주세요");
    }

    // --- 다시 읽기 기능 ---
    function restartReading() {
        // 현재 녹음 중이면 중지
        if (isRecording) {
            stopRecording();
        }
        
        // 첫 번째 문장부터 다시 시작
        currentIndex = -1;
        sentencePassed = false;
        nextSentenceBtn.disabled = true;
        doneBtn.disabled = true;
        restartReadingBtn.disabled = true;
        
        // 문장 스타일 초기화
        updateSentenceStyles();
        
        // 피드백 메시지
        feedbackMessage.textContent = "처음부터 다시 읽어보세요";
        updateVoiceText("음성을 인식하면 여기에 텍스트가 표시됩니다.");
        
        // 첫 번째 문장 표시 및 녹음 시작
        setTimeout(() => {
            showNextSentence();
        }, 500);
    }

    // --- 지문 인식 페이지로 돌아가기 ---
    function goBackToMain() {
        // 현재 녹음 중이면 중지
        if (isRecording) {
            stopRecording();
        }
        
        // 메인 페이지로 이동 (지문 인식 페이지)
        window.location.href = 'main.html';
    }

    // --- 앱 시작 ---
    initialize();
});