document.addEventListener('DOMContentLoaded', () => {
    const feedbackBox = document.querySelector('.box-message');
    const nextButton = document.querySelector('.action-button');

    // 1. Get data from sessionStorage
    const feedback = sessionStorage.getItem('quizFeedback');
    const nextQuestionIndex = sessionStorage.getItem('nextQuestionIndex');
    const fileId = sessionStorage.getItem('fileId');

    // 2. Display feedback
    if (feedbackBox && feedback) {
        feedbackBox.textContent = feedback;
    }

    // 3. Update "Next" button link
    if (nextButton && fileId && nextQuestionIndex) {
        nextButton.href = `problemsolve.html?fileId=${fileId}&question=${nextQuestionIndex}`;
    }
});