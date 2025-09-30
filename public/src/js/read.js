document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const nextSentenceBtn = document.getElementById('next-sentence-btn');
    const micBtn = document.getElementById('mic-btn');
    const recordingAnimation = document.getElementById('recording-animation');
    const feedbackMessage = document.getElementById('feedback-message');
    const retryBtn = document.getElementById('retry-btn');

    // --- 상태 및 설정 변수 --- //
    const BASE_URL = 'https://e-do.onrender.com';
    const STT_URL = 'wss://e-do.onrender.com/stt';
    let sentences = [];
    let currentIndex = -1;
    let isRecording = false;
    let socket;
    let mediaRecorder;
    let mediaStream;

    // --- 초기화 --- //
    async function initialize() {
        // 마이크 권한 요청
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            feedbackMessage.textContent = '마이크 권한이 거부되었습니다.';
            micBtn.style.backgroundColor = '#E0E0E0';
            return;
        }

        // 지문 텍스트 로딩
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color: red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        try {
            passageDisplay.innerHTML = '<p>지문을 불러오는 중입니다...</p>';
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '텍스트를 불러오지 못했습니다.');

            setupSentences(result.fullText || "");

        } catch (error) {
            passageDisplay.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    }

    function setupSentences(text) {
        sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
        currentIndex = -1;
        passageDisplay.innerHTML = '';

        sentences.forEach(sentenceText => {
            const sentenceEl = document.createElement('span');
            sentenceEl.className = 'sentence';
            sentenceEl.textContent = sentenceText.trim();
            passageDisplay.appendChild(sentenceEl);
        });

        showNextSentence();
        nextSentenceBtn.addEventListener('click', showNextSentence);
        micBtn.addEventListener('click', toggleRecording);
        retryBtn.addEventListener('click', () => startRecording());
    }

    // --- 녹음 및 STT 로직 ---
    function toggleRecording() {
        if (isRecording) stopRecording();
        else startRecording();
    }

    function startRecording() {
        if (!mediaStream) return;
        isRecording = true;
        micBtn.classList.add('recording');
        recordingAnimation.classList.add('active');
        feedbackMessage.textContent = "연결 중...";
        retryBtn.classList.remove('active');

        socket = new WebSocket(STT_URL);

        socket.onopen = () => {
            feedbackMessage.textContent = "듣고 있어요...";
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop' }));
            };
            mediaRecorder.start(500); // 0.5초 간격으로 데이터 전송
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'transcript' && data.final) {
                // 최종 결과 도착 시
                stopRecording();
                checkSimilarity(data.text);
            } else if (data.type === 'transcript') {
                // 중간 결과 표시 (선택사항)
                feedbackMessage.textContent = `"${data.text}"`;
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            onRecordingFail("서버 연결에 실패했어요.");
        };

        socket.onclose = () => {
            if (isRecording) stopRecording(); // 비정상 종료 시 정리
        };
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        isRecording = false;
        micBtn.classList.remove('recording');
        recordingAnimation.classList.remove('active');
    }

    function checkSimilarity(transcribedText) {
        const originalSentence = sentences[currentIndex].trim();
        // 간단한 유사도 검사 (실제로는 더 정교한 로직 필요)
        const similarity = (originalSentence.includes(transcribedText.slice(0, 5)));
        
        if (similarity) {
            feedbackMessage.textContent = "잘했어요! 👏";
        } else {
            onRecordingFail("조금 다른 것 같아요. 다시 시도해볼까요?");
        }
    }

    function onRecordingFail(message) {
        stopRecording();
        feedbackMessage.innerHTML = `😢 ${message}`;
        retryBtn.classList.add('active');
    }

    // --- 문장 표시 로직 (이전과 동일) ---
    function showNextSentence() { /* ... */ }
    function updateSentenceStyles() { /* ... */ }

    // --- 앱 시작 ---
    initialize();
});