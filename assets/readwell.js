document.addEventListener('DOMContentLoaded', () => {
    const actionButton = document.querySelector('.action-button');

    // 1. Get fileId from the current URL
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');

    // 2. If fileId exists, append it to the "Go to solve problems" button's link
    if (fileId) {
        actionButton.href = `problemsolve.html?fileId=${fileId}`;
    }
});
