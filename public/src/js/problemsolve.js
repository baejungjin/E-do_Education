document.addEventListener('DOMContentLoaded', async () => {
    const passageContent = document.querySelector('.passage-content');
    const questionText = document.querySelector('.question-text');
    const optionsContainer = document.querySelector('.options-container');
    const submitBtn = document.getElementById('submit-btn');
    const BASE_URL = 'https://e-do.onrender.com';

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedButton = null;

    // --- 로딩 오버레이 유틸 ---
    function ensureLoadingStyles() {
        if (document.getElementById('global-loading-style')) return;
        const style = document.createElement('style');
        style.id = 'global-loading-style';
        style.textContent = `
        .loading-overlay{position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999}
        .loading-spinner{width:64px;height:64px;border-radius:50%;border:6px solid #e9ecef;border-top-color:#42A5F5;animation:spin 1s linear infinite}
        .loading-text{margin-top:14px;font-family:Pretendard,system-ui,sans-serif;font-weight:700;color:#555}
        @keyframes spin{to{transform:rotate(360deg)}}`;
        document.head.appendChild(style);
    }
    function showLoading(message) {
        ensureLoadingStyles();
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text"></div>';
            document.body.appendChild(overlay);
        }
        const textEl = overlay.querySelector('.loading-text');
        textEl.textContent = message || '문제를 불러오는 중...';
        overlay.style.display = 'flex';
    }
    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // --- OCR 줄바꿈 정규화 ---
    function normalizeOcrLineBreaks(raw) {
        if (!raw) return '';
        const unified = raw.replace(/\r/g, '');
        const paragraphs = unified
            .split(/\n{2,}/)
            .map(p => p.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim())
            .filter(Boolean);
        return paragraphs;
    }

    async function initialize() {
        const params = new URLSearchParams(window.location.search);
        const fileId = params.get('fileId');
        const initialIndexParam = params.get('question');
        if (!fileId) {
            questionText.textContent = '오류: 파일 ID가 없습니다.';
            return;
        }

        try {
            showLoading('문제를 불러오는 중...');
            // 1) OCR는 항상 네트워크로 불러옴
            const ocrPromise = fetch(`${BASE_URL}/api/ocr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }) }).then(res => res.json());

            // 2) 퀴즈는 캐시 우선, 없으면 네트워크
            let cached = null;
            try {
                const raw = sessionStorage.getItem(`quizCache:${fileId}`);
                if (raw) cached = JSON.parse(raw);
            } catch {}

            let quizResult;
            if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
                quizResult = { ok: true, questions: cached.questions };
            } else {
                quizResult = await fetch(`${BASE_URL}/api/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, level: '초급', style: '지문 이해' }) }).then(res => res.json());
                if (quizResult.ok && Array.isArray(quizResult.questions) && quizResult.questions.length > 0) {
                    try { sessionStorage.setItem(`quizCache:${fileId}`, JSON.stringify({ fileId, questions: quizResult.questions, ts: Date.now() })); } catch {}
                }
            }

            const ocrResult = await ocrPromise;

            if (!ocrResult.ok) throw new Error(ocrResult.error || '지문 로딩 실패');
            // 명세서 대응 + OCR 줄바꿈 정규화: 단일 개행은 공백, 두 줄 이상은 문단
            const raw = (ocrResult.fullText || ocrResult.preview || '');
            const paragraphs = normalizeOcrLineBreaks(raw);
            passageContent.innerHTML = paragraphs.length
                ? paragraphs.map(p => `<p>${p}</p>`).join('')
                : '';

            if (!quizResult.ok) throw new Error(quizResult.error || '퀴즈 생성 실패');
            questions = Array.isArray(quizResult.questions) ? quizResult.questions : [];
            normalizeAnswerIndices(questions);

            if (questions.length === 0) {
                questionText.textContent = '문제가 없습니다. 다시 시도해 주세요.';
                submitBtn.disabled = true;
                return;
            }

            // 쿼리의 question 인덱스가 있으면 해당 문항으로 이동
            const parsedIndex = Number(initialIndexParam);
            if (!Number.isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < questions.length) {
                currentQuestionIndex = parsedIndex;
            } else {
                currentQuestionIndex = 0;
            }

            displayQuestion();
            hideLoading();

        } catch (error) {
            hideLoading();
            questionText.textContent = `오류: ${error.message}`;
        }
    }

    function displayQuestion() {
        const question = questions[currentQuestionIndex];
        if (!question) return;

        questionText.textContent = `Q${currentQuestionIndex + 1}. ${question.question}`;
        optionsContainer.innerHTML = '';
        selectedButton = null;
        submitBtn.disabled = true;

        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            // 번호 배지 + 체크아이콘 + 보기 텍스트로 명확한 시각/클릭 영역 제공
            button.innerHTML = `<span class="num">${index + 1}</span><span class="check-icon">✔</span><span>${choice}</span>`;
            const correctIndex = Number(question._correctIndex);
            button.dataset.correct = String(index === correctIndex);
            button.addEventListener('click', () => handleOptionSelect(button));
            optionsContainer.appendChild(button);
        });
    }

    function handleOptionSelect(button) {
        if (selectedButton) {
            selectedButton.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedButton = button;
        submitBtn.disabled = false;
    }

    submitBtn.addEventListener('click', () => {
        if (!selectedButton) return;
        const isCorrect = selectedButton.dataset.correct === 'true';

        // 현재 문제/피드백/다음 이동 정보를 저장
        const fileId = new URLSearchParams(window.location.search).get('fileId');
        const current = questions[currentQuestionIndex] || {};
        const nextIndex = currentQuestionIndex + 1;

        try {
            sessionStorage.setItem('quizFeedback', current.explanation || '');
            sessionStorage.setItem('fileId', fileId || '');
            sessionStorage.setItem('nextQuestionIndex', String(nextIndex));
        } catch (e) {
            // 세션 저장 실패는 무시하고 진행
        }

        // 마지막 문제 처리: 정답이면 완료 페이지로 이동
        const isLast = nextIndex >= questions.length;
        if (isCorrect && isLast) {
            window.location.href = 'solvecomplete.html';
            return;
        }

        // 정답: 다음 문제 안내 페이지, 오답: 같은 문제로 재도전 페이지
        window.location.href = isCorrect ? 'right.html' : 'wrong.html';
    });

    initialize();
});

// 정답 인덱스 정규화: 백엔드가 0-based/1-based 혼재 시 일관화
function normalizeAnswerIndices(questions) {
    if (!Array.isArray(questions)) return;
    const samples = [];
    for (const q of questions) {
        const len = Array.isArray(q.choices) ? q.choices.length : 0;
        const ai = Number(q.answerIndex);
        if (!Number.isFinite(ai) || len <= 0) continue;
        samples.push({ ai, len });
    }
    if (samples.length === 0) {
        questions.forEach(q => { q._correctIndex = 0; });
        return;
    }
    const countOneBasedish = samples.filter(s => s.ai >= 1 && s.ai <= s.len).length;
    const ratioOneBasedish = countOneBasedish / samples.length;
    const shift = ratioOneBasedish >= 0.6 ? -1 : 0; // 다수가 1..len 범위면 1-based로 간주
    questions.forEach(q => {
        const len = Array.isArray(q.choices) ? q.choices.length : 0;
        let idx = Number(q.answerIndex);
        if (!Number.isFinite(idx)) idx = 0;
        let normalized = idx + shift;
        if (normalized < 0) normalized = 0;
        if (normalized > len - 1) normalized = len - 1;
        q._correctIndex = normalized;
    });
}