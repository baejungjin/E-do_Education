document.addEventListener('DOMContentLoaded', async () => {
    const passageContent = document.querySelector('.passage-content');
    const questionText = document.querySelector('.question-text');
    const optionsContainer = document.querySelector('.options-container');
    const submitBtn = document.getElementById('submit-btn');
    const BASE_URL = 'https://e-do.onrender.com';

    // 로딩 관련 요소
    const loadingScreen = document.getElementById('loading-screen');
    const wrapper = document.querySelector('.wrapper');

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedButton = null;

    async function initialize() {
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            loadingScreen.innerHTML = '오류: 파일 ID가 없습니다.';
            return;
        }

        try {
            // 병렬로 지문과 퀴즈 데이터 가져오기
            const [ocrResult, quizResult] = await Promise.all([
                fetch(`${BASE_URL}/api/ocr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }) }).then(res => res.json()),
                fetch(`${BASE_URL}/api/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, level: '초급', style: '지문 이해' }) }).then(res => res.json())
            ]);

            if (!ocrResult.ok) throw new Error(ocrResult.error || '지문 로딩 실패');
            passageContent.innerHTML = `<p>${(ocrResult.fullText || '').replace(/\n/g, '</p><p>')}</p>`;

            if (!quizResult.ok) throw new Error(quizResult.error || '퀴즈 생성 실패');
            questions = quizResult.questions || [];
            
            // 데이터 로딩 성공 시 화면 전환
            loadingScreen.style.display = 'none';
            wrapper.style.display = 'block';

            displayQuestion();

        } catch (error) {
            // 오류 발생 시 로딩 화면에 메시지 표시
            loadingScreen.innerHTML = `오류가 발생했습니다: ${error.message}`;
        }
    }

    function displayQuestion() {
        const question = questions[currentQuestionIndex];
        if (!question) return;

        questionText.textContent = `Q${currentQuestionIndex + 1}. ${question.question}`;
        optionsContainer.innerHTML = '';
        selectedButton = null;
        submitBtn.disabled = true;

        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `<span class="check-icon">✔</span><span>${choice}</span>`;
            button.dataset.correct = index === question.answerIndex;
            button.addEventListener('click', () => handleOptionSelect(button));
            optionsContainer.appendChild(button);
        });
    }

    function handleOptionSelect(button) {
        if (selectedButton) {
            selectedButton.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedButton = button;
        submitBtn.disabled = false;
    }

    submitBtn.addEventListener('click', () => {
        if (!selectedButton) return;
        const isCorrect = selectedButton.dataset.correct === 'true';
        window.location.href = isCorrect ? 'right.html' : 'wrong.html';
    });

    initialize();
});
