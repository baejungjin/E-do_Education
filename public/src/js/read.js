document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const nextSentenceBtn = document.getElementById('next-sentence-btn');
    const doneBtn = document.getElementById('done-btn');
    const skipToQuizBtn = document.getElementById('skip-to-quiz-btn');
    // ... 기타 요소

    // --- 상태 변수 --- //
    const BASE_URL = 'https://e-do.onrender.com';
    let sentences = [];
    let currentIndex = -1;
    let fileId = null;

    // --- 초기화 --- //
    async function initialize() {
        fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color: red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        // MVP용 버튼 링크 설정
        skipToQuizBtn.href = `problemsolve.html?fileId=${fileId}`;
        doneBtn.addEventListener('click', () => { window.location.href = `solvecomplete.html?fileId=${fileId}`; });

        // ... (이하 지문 로딩 및 STT 초기화 로직)
        // ...
    }

    function setupSentences(text) {
        // ... (문장 설정 로직)
        showNextSentence();
        nextSentenceBtn.addEventListener('click', showNextSentence);
        // ...
    }

    // --- 문장 표시 로직 ---
    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            nextSentenceBtn.textContent = "모든 문장을 다 읽었어요!";
            nextSentenceBtn.disabled = true;
            doneBtn.disabled = false; // ★ '다 읽었어요' 버튼 활성화
            return;
        }
        currentIndex++;
        updateSentenceStyles();
    }

    function updateSentenceStyles() {
        // ... (이전과 동일)
    }

    // ... (이하 STT 관련 로직)

    // --- 앱 시작 ---
    initialize();
});