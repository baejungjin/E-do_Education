document.addEventListener('DOMContentLoaded', () => {
    const feedbackBox = document.querySelector('.box-message');
    const retryButton = document.querySelector('.action-button');

    // 1. Get data from sessionStorage
    const feedback = sessionStorage.getItem('quizFeedback');
    const nextQuestionIndex = sessionStorage.getItem('nextQuestionIndex');
    const fileId = sessionStorage.getItem('fileId');

    // 2. Display feedback
    if (feedbackBox && feedback) {
        // For wrong answers, the explanation is why the correct answer is correct.
        feedbackBox.textContent = `정답 해설: ${feedback}`;
    }

    // 3. Update "Retry" button to go to the next question
    if (retryButton && fileId && nextQuestionIndex) {
        retryButton.textContent = '다음 문제 풀기'; // Make it clear
        retryButton.href = `problemsolve.html?fileId=${fileId}&question=${nextQuestionIndex}`;
    }
});
