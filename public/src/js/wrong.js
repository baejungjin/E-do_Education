document.addEventListener('DOMContentLoaded', () => {
    const feedbackBox = document.querySelector('.ai-feedback p');
    const retryButton = document.querySelector('.cta-button');

    // 1. Get data from sessionStorage
    const feedback = sessionStorage.getItem('quizFeedback');
    const nextQuestionIndex = sessionStorage.getItem('nextQuestionIndex');
    const fileId = sessionStorage.getItem('fileId');

    // 2. Display feedback (explanation)
    if (feedbackBox && feedback) {
        feedbackBox.textContent = `정답 해설: ${feedback}`;
    }

    // 3. Update "Retry" button to go to the SAME question
    if (retryButton && fileId && nextQuestionIndex) {
        const currentQuestionIndex = Math.max(parseInt(nextQuestionIndex, 10) - 1, 0);
        retryButton.href = `problemsolve.html?fileId=${fileId}&question=${currentQuestionIndex}`;
    }
});