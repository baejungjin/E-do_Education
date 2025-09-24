document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const passageTitle = document.querySelector('.passage-title');
    const passageContent = document.querySelector('.passage-content');
    const quizTitle = document.querySelector('.side-title');
    const optionsContainer = document.querySelector('.options-container');

    // --- API & State ---
    const BASE_URL = 'https://e-do.onrender.com';
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');
    let questions = [];
    let currentQuestionIndex = 0;

    // --- Initialization ---
    if (fileId) {
        // Start by fetching the passage, then the quiz
        fetchOcrTextAndQuiz(fileId);
    } else {
        // Handle missing fileId
        passageContent.textContent = '오류: 파일 ID를 찾을 수 없습니다. 이전 페이지로 돌아가 다시 시도해주세요.';
        quizTitle.textContent = '문제를 불러올 수 없습니다.';
        console.error('File ID not found in URL');
    }

    // --- Functions ---

    /**
     * Fetches both OCR text and the quiz questions.
     * @param {string} id - The file ID.
     */
    async function fetchOcrTextAndQuiz(id) {
        await fetchOcrText(id); // Wait for the passage to load
        await fetchQuiz(id);      // Then load the quiz
    }

    /**
     * Fetches and displays the OCR text for the passage.
     * @param {string} id - The file ID.
     */
    async function fetchOcrText(id) {
        passageTitle.textContent = '지문 로딩 중...';
        passageContent.textContent = '지문을 불러오는 중입니다. 잠시만 기다려주세요...';
        try {
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileld: id }),
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            const result = await response.json();
            if (result.ok) {
                passageTitle.textContent = '오늘의 지문';
                passageContent.textContent = result.preview;
            } else {
                throw new Error(result.error || '알 수 없는 오류');
            }
        } catch (error) {
            passageTitle.textContent = '오류';
            passageContent.textContent = `지문을 불러오는 데 실패했습니다: ${error.message}`;
            console.error('OCR Fetch Error:', error);
        }
    }

    /**
     * Fetches the quiz questions from the API.
     * @param {string} id - The file ID.
     */
    async function fetchQuiz(id) {
        quizTitle.textContent = '문제 생성 중...';
        optionsContainer.innerHTML = ''; // Clear old options
        try {
            const response = await fetch(`${BASE_URL}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileld: id }), // Using defaults for level/style
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            const result = await response.json();
            if (result.ok && result.questions && result.questions.length > 0) {
                // Store questions in session storage to persist across pages
                sessionStorage.setItem('quizQuestions', JSON.stringify(result.questions));
                sessionStorage.setItem('fileId', id);

                // Check if we are returning to a specific question
                const questionIndex = parseInt(urlParams.get('question') || '0', 10);
                currentQuestionIndex = questionIndex;
                
                displayCurrentQuestion();
            } else {
                throw new Error(result.error || '문제를 생성하지 못했습니다.');
            }
        } catch (error) {
            quizTitle.textContent = '오류';
            optionsContainer.innerHTML = `<p>문제를 불러오는 데 실패했습니다: ${error.message}</p>`;
            console.error('Quiz Fetch Error:', error);
        }
    }

    /**
     * Displays the current question and its options.
     */
    function displayCurrentQuestion() {
        const storedQuestions = sessionStorage.getItem('quizQuestions');
        if (!storedQuestions) return;
        questions = JSON.parse(storedQuestions);

        if (currentQuestionIndex >= questions.length) {
            // Handle quiz completion
            quizTitle.textContent = '퀴즈 완료!';
            optionsContainer.innerHTML = '<p>모든 문제를 다 풀었습니다! 수고하셨습니다.</p><a href="main.html" class="action-button">메인으로 돌아가기</a>';
            return;
        }

        const question = questions[currentQuestionIndex];
        quizTitle.textContent = `Q${currentQuestionIndex + 1}. ${question.question}`;
        optionsContainer.innerHTML = ''; // Clear previous options

        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.classList.add('option-button', `option-color-${(index % 5) + 1}`);
            button.textContent = `${index + 1}. ${choice}`;
            button.dataset.choiceIndex = index; // Store the index of this choice

            button.addEventListener('click', handleOptionClick);
            optionsContainer.appendChild(button);
        });
    }

    /**
     * Handles the click event on a choice button.
     * @param {Event} event - The click event.
     */
    function handleOptionClick(event) {
        const selectedIndex = parseInt(event.target.dataset.choiceIndex, 10);
        const question = questions[currentQuestionIndex];
        const correctIndex = question.answerIndex;

        // Store feedback for the next page
        sessionStorage.setItem('quizFeedback', question.explanation);
        sessionStorage.setItem('nextQuestionIndex', currentQuestionIndex + 1);

        if (selectedIndex === correctIndex) {
            window.location.href = 'right.html';
        } else {
            window.location.href = 'wrong.html';
        }
    }

    // This part handles returning to a specific question without re-fetching everything
    const storedFileId = sessionStorage.getItem('fileId');
    const questionIndex = urlParams.get('question');
    if (questionIndex && storedFileId && storedFileId === fileId) {
        currentQuestionIndex = parseInt(questionIndex, 10);
        fetchOcrText(fileId); // Still need to fetch passage text
        displayCurrentQuestion(); // But use stored questions
    } else if (fileId) {
        // Default path: fetch everything
        fetchOcrTextAndQuiz(fileId);
    }

});