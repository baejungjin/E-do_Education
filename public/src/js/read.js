document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const originalTextEl = document.getElementById('original-text');
    const nextSentenceBtn = document.getElementById('next-sentence-btn');
    const micBtn = document.getElementById('mic-btn');
    const recordingAnimation = document.getElementById('recording-animation');
    const feedbackMessage = document.getElementById('feedback-message');
    const retryBtn = document.getElementById('retry-btn');
    const doneBtn = document.getElementById('done-btn');

    // --- 상태 변수 --- //
    let sentences = [];
    let currentIndex = -1;
    let isRecording = false;
    // STT 관련 변수는 기존 로직을 따름 (socket, mediaRecorder 등)

    // --- 초기화 --- //
    function initialize() {
        const fullText = originalTextEl.textContent.trim();
        // 문장 분리 로직 개선
        sentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
        currentIndex = -1;
        passageDisplay.innerHTML = '';
        
        // 문장들을 DOM에 추가
        sentences.forEach(text => {
            const sentenceEl = document.createElement('span');
            sentenceEl.className = 'sentence';
            sentenceEl.textContent = text.trim();
            passageDisplay.appendChild(sentenceEl);
        });

        // 첫 문장 표시
        showNextSentence();
        
        // 이벤트 리스너 바인딩
        nextSentenceBtn.addEventListener('click', showNextSentence);
        micBtn.addEventListener('click', toggleRecording);
        retryBtn.addEventListener('click', retryRecording);
    }

    // --- 문장 관리 --- //
    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            feedbackMessage.textContent = "모든 문장을 다 읽었어요!";
            nextSentenceBtn.style.display = 'none';
            return;
        }

        currentIndex++;
        updateSentenceStyles();
    }

    function updateSentenceStyles() {
        const sentenceElements = passageDisplay.querySelectorAll('.sentence');
        sentenceElements.forEach((el, index) => {
            el.classList.remove('current', 'previous', 'visible');
            if (index < currentIndex) {
                el.classList.add('previous', 'visible');
            } else if (index === currentIndex) {
                el.classList.add('current', 'visible');
            }
        });
    }

    // --- 녹음 관리 (기존 로직과 통합) --- //
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        isRecording = true;
        micBtn.classList.add('recording');
        recordingAnimation.classList.add('active');
        feedbackMessage.textContent = "듣고 있어요...";
        retryBtn.classList.remove('active');
        // 여기에 기존의 WebSocket 및 MediaRecorder 시작 로직을 통합합니다.
        // 예: stt_start();
        console.log("녹음 시작");
    }

    function stopRecording() {
        isRecording = false;
        micBtn.classList.remove('recording');
        recordingAnimation.classList.remove('active');
        // 여기에 기존의 WebSocket 및 MediaRecorder 중지 로직을 통합합니다.
        // 예: stt_stop();
        console.log("녹음 중지");
        // 성공/실패 처리는 STT 서버 메시지 수신 시 처리
    }

    function retryRecording() {
        feedbackMessage.textContent = "다시 시도하세요!";
        startRecording();
    }

    // --- STT 결과 처리 (기존 로직을 수정하여 통합) --- //
    // 가상 STT 결과 처리기
    function onSttMessage(data) {
        if (data.type === 'final_transcript') {
            stopRecording();
            // 유사도 검사 (가정)
            const isSuccess = Math.random() > 0.3; // 70% 성공 확률
            if (isSuccess) {
                onRecordingSuccess();
            } else {
                onRecordingFail();
            }
        }
    }

    function onRecordingSuccess() {
        feedbackMessage.textContent = "잘했어요! 👏";
    }

    function onRecordingFail() {
        feedbackMessage.innerHTML = "잠시 문제가 생겼어요 😢 <br> 다시 시도해볼까요?";
        retryBtn.classList.add('active');
    }

    // --- 앱 시작 --- //
    initialize();
});