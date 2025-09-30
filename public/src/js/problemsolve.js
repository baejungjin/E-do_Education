document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const passageContent = document.querySelector('.passage-content');
    const questionText = document.querySelector('.question-text');
    const optionsContainer = document.querySelector('.options-container');
    const submitBtn = document.getElementById('submit-btn');
    const loadingScreen = document.getElementById('loading-screen');
    const wrapper = document.querySelector('.wrapper');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackExplanation = document.getElementById('feedback-explanation');

    // --- API & State ---
    const BASE_URL = 'https://e-do.onrender.com';
    let questions = [];
    let quizResults = JSON.parse(sessionStorage.getItem('quizResults')) || []; // 이전 결과 불러오기
    let currentQuestionIndex = 0;
    let selectedButton = null;
    let feedbackIsShown = false; // 피드백 표시 상태
    let wasCorrect = false; // 현재 문제 정답 여부

    // --- Functions ---
    async function fetchData(endpoint, body) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!result.ok) {
            throw new Error(result.error || `API call to ${endpoint} failed`);
        }
        return result;
    }

    async function initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const fileId = urlParams.get('fileId');
        currentQuestionIndex = parseInt(urlParams.get('q') || '0', 10);

        if (currentQuestionIndex === 0) {
            quizResults = []; // 첫 문제일 경우 결과 초기화
        }

        if (!fileId) {
            loadingScreen.innerHTML = '오류: 파일 ID가 없습니다.';
            return;
        }

        try {
            // 퀴즈 데이터는 한 번만 불러오도록 sessionStorage 사용
            let cachedQuiz = sessionStorage.getItem(`quiz_${fileId}`);
            if (!cachedQuiz) {
                const [ocrResult, quizResult] = await Promise.all([
                    fetchData('/api/ocr', { fileId }),
                    fetchData('/api/quiz', { fileId, level: '초급', style: '지문 이해' })
                ]);
                cachedQuiz = { ocr: ocrResult, quiz: quizResult };
                sessionStorage.setItem(`quiz_${fileId}`, JSON.stringify(cachedQuiz));
            } else {
                cachedQuiz = JSON.parse(cachedQuiz);
            }

            passageContent.innerHTML = `<p>${(cachedQuiz.ocr.fullText || '').replace(/\n/g, '</p><p>')}</p>`;
            questions = cachedQuiz.quiz.questions || [];
            
            loadingScreen.style.display = 'none';
            wrapper.style.display = 'block';

            displayQuestion();

        } catch (error) {
            loadingScreen.innerHTML = `오류가 발생했습니다: ${error.message}`;
        }
    }

    function displayQuestion() {
        feedbackIsShown = false;
        selectedButton = null;
        feedbackContainer.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = '제출하기';

        const question = questions[currentQuestionIndex];
        if (!question) {
            window.location.href = 'solvecomplete.html'; // 모든 문제를 풀었으면 완료 페이지로
            return;
        }

        questionText.textContent = `Q${currentQuestionIndex + 1}. ${question.question}`;
        optionsContainer.innerHTML = '';

        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `<span>${choice}</span>`;
            button.dataset.index = index;
            button.addEventListener('click', () => handleOptionSelect(button));
            optionsContainer.appendChild(button);
        });
    }

    function handleOptionSelect(button) {
        if (feedbackIsShown) return;
        if (selectedButton) {
            selectedButton.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedButton = button;
        submitBtn.disabled = false;
    }

    async function showFeedback() {
        const question = questions[currentQuestionIndex];
        const explanation = wasCorrect 
            ? "정확합니다! 지문의 핵심 내용을 잘 이해하고 있다는 의미입니다."
            : `아쉽네요. 정답은 "${question.choices[question.answerIndex]}"입니다.`;

        if (wasCorrect) {
            feedbackContainer.className = 'correct';
            feedbackTitle.textContent = '정답입니다! 🎉';
            selectedButton.classList.add('user-correct');
        } else {
            feedbackContainer.className = 'incorrect';
            feedbackTitle.textContent = '아쉽지만 틀렸어요. 😢';
            selectedButton.classList.add('user-incorrect');
            const correctButton = optionsContainer.querySelector(`[data-index="${question.answerIndex}"]`);
            if (correctButton) {
                correctButton.classList.add('actual-answer');
            }
        }

        feedbackExplanation.textContent = explanation;
        feedbackContainer.style.display = 'block';
    }

    async function handleSubmit() {
        if (!selectedButton || feedbackIsShown) return;
        
        submitBtn.disabled = true;
        const question = questions[currentQuestionIndex];
        const selectedIndex = parseInt(selectedButton.dataset.index, 10);
        wasCorrect = selectedIndex === question.answerIndex;

        quizResults.push({ question: question.question, isCorrect: wasCorrect });
        sessionStorage.setItem('quizResults', JSON.stringify(quizResults));

        optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        await showFeedback();

        submitBtn.textContent = '결과 페이지로 이동';
        submitBtn.disabled = false;
        feedbackIsShown = true;
    }

    function handleRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const fileId = urlParams.get('fileId');
        const nextQIndex = currentQuestionIndex + 1;

        // 다음 페이지 URL을 세션에 저장
        let nextPageUrl = `problemsolve.html?fileId=${fileId}&q=${nextQIndex}`;
        if (nextQIndex >= questions.length) {
            nextPageUrl = 'solvecomplete.html';
        }
        sessionStorage.setItem('nextPageUrl', nextPageUrl);

        // 정답/오답 페이지로 이동
        if (wasCorrect) {
            window.location.href = 'right.html';
        } else {
            window.location.href = 'wrong.html';
        }
    }

    submitBtn.addEventListener('click', () => {
        if (feedbackIsShown) {
            handleRedirect();
        } else {
            handleSubmit();
        }
    });

    initialize();
});
