document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const nextSentenceBtn = document.getElementById('next-sentence-btn');
    const micBtn = document.getElementById('mic-btn');
    const recordingAnimation = document.getElementById('recording-animation');
    const feedbackMessage = document.getElementById('feedback-message');
    const retryBtn = document.getElementById('retry-btn');
    const doneBtn = document.getElementById('done-btn');
    const skipToQuizBtn = document.getElementById('skip-to-quiz-btn');

    // --- 상태 및 설정 변수 ---
    const BASE_URL = 'https://e-do.onrender.com';
    const STT_URL = 'wss://e-do.onrender.com/stt';
    let sentences = [];
    let currentIndex = -1;
    let isRecording = false;
    let socket;
    let mediaRecorder;
    let mediaStream;
    let fileId = null;

    // --- 초기화 ---
    async function initialize() {
        fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color: red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        // MVP용 버튼 링크 설정
        skipToQuizBtn.href = `problemsolve.html?fileId=${fileId}`;
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

    // --- 문장 표시 로직 ---
    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            nextSentenceBtn.textContent = "모든 문장을 다 읽었어요!";
            nextSentenceBtn.disabled = true;
            return;
        }
        currentIndex++;
        updateSentenceStyles();
    }

    function updateSentenceStyles() {
        passageDisplay.querySelectorAll('.sentence').forEach((el, index) => {
            el.classList.remove('current', 'previous', 'visible');
            if (index < currentIndex) el.classList.add('previous', 'visible');
            else if (index === currentIndex) el.classList.add('current', 'visible');
        });
    }

    // --- 녹음 및 STT 로직 (수동 시작/종료) ---
    function toggleRecording() {
        if (isRecording) stopRecording();
        else startRecording();
    }

    function startRecording() {
        if (!mediaStream) return;
        isRecording = true;
        micBtn.classList.add('recording');
        recordingAnimation.classList.add('active');
        feedbackMessage.textContent = "읽고 나서 버튼을 다시 눌러주세요";
        retryBtn.classList.remove('active');

        socket = new WebSocket(STT_URL);
        socket.onopen = () => {
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(event.data);
            };
            mediaRecorder.onstop = () => {
                if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop' }));
            };
            mediaRecorder.start(500);
        };
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'transcript' && data.final) {
                checkSimilarity(data.text);
            } else if (data.type === 'transcript') {
                // 중간 결과 표시 (선택사항)
            }
        };
        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            onRecordingFail("서버 연결에 실패했어요.");
        };
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        isRecording = false;
        micBtn.classList.remove('recording');
        recordingAnimation.classList.remove('active');
        feedbackMessage.textContent = "분석 중...";
    }

    function checkSimilarity(transcribedText) {
        const originalSentence = sentences[currentIndex].trim();
        const similarity = (originalSentence.includes(transcribedText.slice(0, 5)));
        if (similarity) {
            feedbackMessage.textContent = "잘했어요! 👏";
            // 마지막 문장까지 성공하면 '다 읽었어요' 버튼 활성화
            if (currentIndex === sentences.length - 1) {
                doneBtn.disabled = false;
            }
        } else {
            onRecordingFail("조금 다른 것 같아요. 다시 시도해볼까요?");
        }
    }

    function onRecordingFail(message) {
        feedbackMessage.innerHTML = `😢 ${message}`;
        retryBtn.classList.add('active');
    }

    // --- 앱 시작 ---
    initialize();
});