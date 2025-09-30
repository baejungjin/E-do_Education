document.addEventListener('DOMContentLoaded', async () => {
    const passageContent = document.querySelector('.passage-content');
    const questionText = document.querySelector('.question-text');
    const optionsContainer = document.querySelector('.options-container');
    const submitBtn = document.getElementById('submit-btn');
    const BASE_URL = 'https://e-do.onrender.com';

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedButton = null;

    async function initialize() {
        const params = new URLSearchParams(window.location.search);
        const fileId = params.get('fileId');
        const initialIndexParam = params.get('question');
        if (!fileId) {
            questionText.textContent = '오류: 파일 ID가 없습니다.';
            return;
        }

        try {
            // Fetch both OCR and Quiz in parallel
            const [ocrResult, quizResult] = await Promise.all([
                fetch(`${BASE_URL}/api/ocr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }) }).then(res => res.json()),
                fetch(`${BASE_URL}/api/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, level: '초급', style: '지문 이해' }) }).then(res => res.json())
            ]);

            if (!ocrResult.ok) throw new Error(ocrResult.error || '지문 로딩 실패');
            passageContent.innerHTML = `<p>${(ocrResult.fullText || '').replace(/\n/g, '</p><p>')}</p>`;

            if (!quizResult.ok) throw new Error(quizResult.error || '퀴즈 생성 실패');
            questions = Array.isArray(quizResult.questions) ? quizResult.questions : [];

            if (questions.length === 0) {
                questionText.textContent = '문제가 없습니다. 다시 시도해 주세요.';
                submitBtn.disabled = true;
                return;
            }

            // 쿼리의 question 인덱스가 있으면 해당 문항으로 이동
            const parsedIndex = Number(initialIndexParam);
            if (!Number.isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < questions.length) {
                currentQuestionIndex = parsedIndex;
            } else {
                currentQuestionIndex = 0;
            }

            displayQuestion();

        } catch (error) {
            questionText.textContent = `오류: ${error.message}`;
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

        // 현재 문제/피드백/다음 이동 정보를 저장
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        const current = questions[currentQuestionIndex] || {};
        const nextIndex = currentQuestionIndex + 1;

        try {
            sessionStorage.setItem('quizFeedback', current.explanation || '');
            sessionStorage.setItem('fileId', fileId || '');
            sessionStorage.setItem('nextQuestionIndex', String(nextIndex));
        } catch (e) {
            // 세션 저장 실패는 무시하고 진행
        }

        // 마지막 문제 처리: 정답이면 완료 페이지로 이동
        const isLast = nextIndex >= questions.length;
        if (isCorrect && isLast) {
            window.location.href = 'solvecomplete.html';
            return;
        }

        // 정답: 다음 문제 안내 페이지, 오답: 같은 문제로 재도전 페이지
        window.location.href = isCorrect ? 'right.html' : 'wrong.html';
    });

    initialize();
});