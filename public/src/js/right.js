document.addEventListener('DOMContentLoaded', () => {
    const nextButton = document.getElementById('next-btn');
    const nextPageUrl = sessionStorage.getItem('nextPageUrl');

    if (nextButton && nextPageUrl) {
        nextButton.href = nextPageUrl;
    } else if (nextButton) {
        // Fallback if the URL is not found
        nextButton.href = 'main.html';
    }
});