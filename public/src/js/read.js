document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 --- //
    const passageDisplay = document.getElementById('passage-display');
    const nextSentenceBtn = document.getElementById('next-sentence-btn');
    const micBtn = document.getElementById('mic-btn');
    // ... (기타 UI 요소)

    // --- 상태 변수 --- //
    const BASE_URL = 'https://e-do.onrender.com';
    let sentences = [];
    let currentIndex = -1;

    // --- 초기화 --- //
    async function initialize() {
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color: red;">오류: 파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        try {
            passageDisplay.innerHTML = '<p>지문을 불러오는 중입니다...</p>';
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '텍스트를 불러오지 못했습니다.');

            const fullText = result.fullText || "";
            setupSentences(fullText);

        } catch (error) {
            passageDisplay.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    }

    function setupSentences(text) {
        sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
        currentIndex = -1;
        passageDisplay.innerHTML = '';

        sentences.forEach(sentenceText => {
            const sentenceEl = document.createElement('span');
            sentenceEl.className = 'sentence';
            sentenceEl.textContent = sentenceText.trim();
            passageDisplay.appendChild(sentenceEl);
        });

        showNextSentence();
        nextSentenceBtn.addEventListener('click', showNextSentence);
        // ... (기타 이벤트 리스너)
    }

    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            nextSentenceBtn.textContent = "모든 문장을 다 읽었어요!";
            nextSentenceBtn.disabled = true;
            return;
        }
        currentIndex++;
        updateSentenceStyles();
    }

    function updateSentenceStyles() {
        passageDisplay.querySelectorAll('.sentence').forEach((el, index) => {
            el.classList.remove('current', 'previous', 'visible');
            if (index < currentIndex) {
                el.classList.add('previous', 'visible');
            } else if (index === currentIndex) {
                el.classList.add('current', 'visible');
            }
        });
    }

    // --- STT 로직 (추후 복원 필요) ---
    // micBtn.addEventListener(...);

    // --- 앱 시작 ---
    initialize();
});