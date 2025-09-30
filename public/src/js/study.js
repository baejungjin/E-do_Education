document.addEventListener('DOMContentLoaded', async () => {
    const quizContainer = document.getElementById('quiz-container');
    const nextBtn = document.getElementById('next-btn');
    const BASE_URL = 'https://e-do.onrender.com';

    let questions = [];
    let currentQuestionIndex = 0;

    async function initialize() {
        const fileId = new URLSearchParams(window.location.search).get('fileId') || localStorage.getItem('currentFileId');
        if (!fileId) {
            quizContainer.innerHTML = '<p style="color: red;">퀴즈를 불러올 파일 ID가 없습니다.</p>';
            return;
        }

        try {
            quizContainer.innerHTML = '<p>퀴즈를 생성 중입니다...</p>';
            const response = await fetch(`${BASE_URL}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, level: "초급", style: "지문 이해" })
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '퀴즈 생성 실패');

            questions = result.questions || [];
            if (questions.length === 0) throw new Error('생성된 퀴즈가 없습니다.');
            
            displayQuestion();

        } catch (error) {
            quizContainer.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    }

    function displayQuestion() {
        const question = questions[currentQuestionIndex];
        if (!question) return;

        let optionsHtml = question.choices.map((choice, index) => 
            `<button class="option-btn" data-index="${index}">${choice}</button>`
        ).join('');

        quizContainer.innerHTML = `
            <div class="question">Q${currentQuestionIndex + 1}. ${question.question}</div>
            <div class="options">${optionsHtml}</div>
        `;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', handleAnswerClick);
        });

        nextBtn.style.display = 'none';
    }

    function handleAnswerClick(event) {
        const selectedIndex = parseInt(event.target.dataset.index, 10);
        const question = questions[currentQuestionIndex];
        const correctIndex = question.answerIndex;

        // 모든 버튼 비활성화
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        if (selectedIndex === correctIndex) {
            event.target.classList.add('correct');
            alert(`정답입니다! 🎉\n\n해설: ${question.explanation}`);
        } else {
            event.target.classList.add('incorrect');
            // 정답 버튼도 표시
            document.querySelector(`.option-btn[data-index="${correctIndex}"]`).classList.add('correct');
            alert(`아쉬워요, 정답은 ${correctIndex + 1}번 입니다.\n\n해설: ${question.explanation}`);
        }

        // 마지막 문제가 아니면 "다음 문제" 버튼 표시
        if (currentQuestionIndex < questions.length - 1) {
            nextBtn.style.display = 'block';
        } else {
            quizContainer.innerHTML += '<p style="margin-top: 20px; font-weight: bold;">모든 문제를 풀었습니다!</p>';
        }
    }

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    initialize();
});