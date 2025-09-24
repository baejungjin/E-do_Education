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

    // 3. Update "Retry" button to go to the SAME question
    if (retryButton && fileId && nextQuestionIndex) {
        // nextQuestionIndex는 (현재 인덱스 + 1)이므로, 1을 빼서 현재 문제 인덱스를 구합니다.
        const currentQuestionIndex = parseInt(nextQuestionIndex, 10) - 1;
        retryButton.href = `problemsolve.html?fileId=${fileId}&question=${currentQuestionIndex}`;
        // HTML에 있는 버튼 텍스트 "다시 풀기"를 그대로 사용합니다.
    }
});