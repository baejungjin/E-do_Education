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
    let quizResults = [];
    let currentQuestionIndex = 0;
    let selectedButton = null;
    let isSubmitting = false; // Prevent multiple submissions

    // --- Functions ---

    /**
     * Fetches data from the API.
     * @param {string} endpoint - The API endpoint to call.
     * @param {object} body - The request body.
     * @returns {Promise<object>} - The JSON response from the API.
     */
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

    /**
     * Initializes the quiz page by fetching passage and questions.
     */
    async function initialize() {
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            loadingScreen.innerHTML = '오류: 파일 ID가 없습니다.';
            return;
        }

        try {
            const [ocrResult, quizResult] = await Promise.all([
                fetchData('/api/ocr', { fileId }),
                fetchData('/api/quiz', { fileId, level: '초급', style: '지문 이해' })
            ]);

            passageContent.innerHTML = `<p>${(ocrResult.fullText || '').replace(/\n/g, '</p><p>')}</p>`;
            questions = quizResult.questions || [];
            
            loadingScreen.style.display = 'none';
            wrapper.style.display = 'block';

            displayQuestion();

        } catch (error) {
            loadingScreen.innerHTML = `오류가 발생했습니다: ${error.message}`;
        }
    }

    /**
     * Displays the current question and options.
     */
    function displayQuestion() {
        // Reset state from previous question
        isSubmitting = false;
        selectedButton = null;
        feedbackContainer.style.display = 'none';
        feedbackContainer.className = ''; // Remove correct/incorrect classes
        submitBtn.disabled = true;
        submitBtn.textContent = '제출하기';

        const question = questions[currentQuestionIndex];
        if (!question) return;

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

    /**
     * Handles the selection of an answer option.
     */
    function handleOptionSelect(button) {
        if (isSubmitting) return; // Don't allow selection after submission
        if (selectedButton) {
            selectedButton.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedButton = button;
        submitBtn.disabled = false;
    }

    /**
     * Shows feedback UI after an answer is submitted.
     */
    async function showFeedback(isCorrect) {
        const question = questions[currentQuestionIndex];

        // TODO: API 명세에 따라 피드백 API를 호출하고, 아래 explanation을 교체해야 합니다.
        // const feedbackResult = await fetchData('/api/feedback', { questionId: question.id });
        // const explanation = feedbackResult.explanation;
        const explanation = isCorrect 
            ? "정확합니다! 지문의 핵심 내용을 잘 이해하고 있다는 의미입니다."
            : `아쉽네요. 정답은 "${question.choices[question.answerIndex]}"입니다. 해당 선택지가 정답인 이유는 지문의 특정 부분에서 찾을 수 있습니다.`;

        if (isCorrect) {
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

    /**
     * Handles the submission of an answer.
     */
    async function handleSubmit() {
        if (!selectedButton || isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;

        const question = questions[currentQuestionIndex];
        const selectedIndex = parseInt(selectedButton.dataset.index, 10);
        const isCorrect = selectedIndex === question.answerIndex;

        quizResults.push({ question: question.question, isCorrect });

        optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        await showFeedback(isCorrect);

        submitBtn.textContent = '다음 문제';
        submitBtn.disabled = false;
    }

    /**
     * Handles the click on the "Next" button.
     */
    function handleNext() {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            displayQuestion();
        } else {
            sessionStorage.setItem('quizResults', JSON.stringify(quizResults));
            window.location.href = 'solvecomplete.html';
        }
    }

    // --- Event Listeners ---
    submitBtn.addEventListener('click', () => {
        if (isSubmitting) {
            handleNext();
        } else {
            handleSubmit();
        }
    });

    // --- Initial Load ---
    initialize();
});