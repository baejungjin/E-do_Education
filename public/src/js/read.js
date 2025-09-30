document.addEventListener('DOMContentLoaded', async () => {
    const passageDisplay = document.getElementById('passage-display');
    // ... (다른 UI 요소들)
    const BASE_URL = 'https://e-do.onrender.com';

    let sentences = [];
    let currentIndex = -1;

    async function initialize() {
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.textContent = '오류: 파일 ID를 찾을 수 없습니다.';
            return;
        }

        try {
            // 1. Fetch OCR Text
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '텍스트 로딩 실패');

            // 2. Initialize UI with fetched text
            const fullText = result.fullText || "";
            sentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
            passageDisplay.innerHTML = '';
            sentences.forEach(text => {
                const sentenceEl = document.createElement('span');
                sentenceEl.className = 'sentence';
                sentenceEl.textContent = text.trim();
                passageDisplay.appendChild(sentenceEl);
            });

            showNextSentence();
            // ... (이벤트 리스너 바인딩)

        } catch (error) {
            passageDisplay.textContent = `오류: ${error.message}`;
        }
    }

    function showNextSentence() { /* 이전과 동일 */ }
    function updateSentenceStyles() { /* 이전과 동일 */ }
    // ... (이하 STT 관련 로직)

    initialize();
});