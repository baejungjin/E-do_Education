document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const passageTitle = document.querySelector('.passage-title');
    const passageContent = document.querySelector('.passage-content');
    const quizTitle = document.querySelector('.side-title');
    const optionsContainer = document.querySelector('.options-container');

    // --- API & State ---
    const BASE_URL = 'https://e-do.onrender.com';
    let questions = [];
    let currentQuestionIndex = 0;

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');
    const questionIndexStr = urlParams.get('question'); // Can be "0", "1", etc. or null

    // Main entry point
    initialize();

    function initialize() {
        if (!fileId) {
            showError('파일 ID를 찾을 수 없습니다. 이전 페이지로 돌아가 다시 시도해주세요.');
            return;
        }

        const storedFileId = sessionStorage.getItem('fileId');
        const storedQuestions = sessionStorage.getItem('quizQuestions');

        // If a question index is specified and it matches the stored data, just display it.
        if (questionIndexStr !== null && fileId === storedFileId && storedQuestions) {
            console.log("Displaying stored question.");
            questions = JSON.parse(storedQuestions);
            currentQuestionIndex = parseInt(questionIndexStr, 10);
            
            fetchOcrText(fileId); // Fetch passage text
            displayCurrentQuestion(); // Display the specific question
        } else {
            // Otherwise, fetch everything new from the server.
            console.log("Fetching new passage and quiz.");
            fetchOcrTextAndQuiz(fileId);
        }
    }

    function showError(message) {
        passageTitle.textContent = '오류';
        passageContent.textContent = message;
        quizTitle.textContent = '문제를 불러올 수 없습니다.';
        console.error(message);
    }

    async function fetchOcrTextAndQuiz(id) {
        // Use Promise.all to fetch in parallel
        await Promise.all([
            fetchOcrText(id),
            fetchQuiz(id)
        ]);
    }

    async function fetchOcrText(id) {
        passageTitle.textContent = '지문 로딩 중...';
        passageContent.textContent = '지문을 불러오는 중입니다...';
        try {
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: id }),
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            const result = await response.json();
            if (result.ok) {
                passageTitle.textContent = '오늘의 지문';
                passageContent.textContent = result.fullText;
            } else {
                throw new Error(result.error || '알 수 없는 오류');
            }
        } catch (error) {
            showError(`지문을 불러오는 데 실패했습니다: ${error.message}`);
        }
    }

    async function fetchQuiz(id) {
        quizTitle.textContent = '문제 생성 중...';
        optionsContainer.innerHTML = '';
        try {
            const response = await fetch(`${BASE_URL}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: id }),
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            const result = await response.json();
            if (result.ok && result.questions && result.questions.length > 0) {
                questions = result.questions;
                sessionStorage.setItem('quizQuestions', JSON.stringify(questions));
                sessionStorage.setItem('fileId', id);
                currentQuestionIndex = 0; // Start from the first question
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

    function displayCurrentQuestion() {
        if (currentQuestionIndex >= questions.length) {
            quizTitle.textContent = '퀴즈 완료!';
            optionsContainer.innerHTML = '<p>모든 문제를 다 풀었습니다! 수고하셨습니다.</p><a href="main.html" class="action-button" style="text-decoration: none; display: flex; justify-content: center; align-items: center;">메인으로 돌아가기</a>';
            return;
        }

        const question = questions[currentQuestionIndex];
        quizTitle.textContent = `Q${currentQuestionIndex + 1}. ${question.question}`;
        optionsContainer.innerHTML = '';

        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.classList.add('option-button', `option-color-${(index % 5) + 1}`);
            button.textContent = `${index + 1}. ${choice}`;
            button.dataset.choiceIndex = index;
            button.addEventListener('click', handleOptionClick);
            optionsContainer.appendChild(button);
        });
    }

    function handleOptionClick(event) {
        const selectedIndex = parseInt(event.target.dataset.choiceIndex, 10);
        const question = questions[currentQuestionIndex];
        const correctIndex = question.answerIndex;

        sessionStorage.setItem('quizFeedback', question.explanation);
        sessionStorage.setItem('nextQuestionIndex', currentQuestionIndex + 1);

        if (selectedIndex === correctIndex) {
            window.location.href = 'right.html';
        } else {
            window.location.href = 'wrong.html';
        }
    }
});
