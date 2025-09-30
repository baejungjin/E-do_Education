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
            // 1) OCR
            const ocrPromise = fetch(`${BASE_URL}/api/ocr`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ fileId }) 
            }).then(res => res.json());

            // 2) 퀴즈 (캐시 → 네트워크)
            let cached = null;
            try {
                const raw = sessionStorage.getItem(`quizCache:${fileId}`);
                if (raw) cached = JSON.parse(raw);
            } catch {}

            let quizResult;
            if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
                quizResult = { ok: true, questions: cached.questions };
            } else {
                quizResult = await fetch(`${BASE_URL}/api/quiz`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ fileId, level: '초급', style: '지문 이해' }) 
                }).then(res => res.json());
                if (quizResult.ok && Array.isArray(quizResult.questions) && quizResult.questions.length > 0) {
                    try { 
                        sessionStorage.setItem(`quizCache:${fileId}`, JSON.stringify({ fileId, questions: quizResult.questions, ts: Date.now() })); 
                    } catch {}
                }
            }

            const ocrResult = await ocrPromise;

            if (!ocrResult.ok) throw new Error(ocrResult.error || '지문 로딩 실패');
            // OCR 줄바꿈 정규화
            const raw = (ocrResult.fullText || ocrResult.preview || '');
            const paragraphs = normalizeOcrLineBreaks(raw);
            passageContent.innerHTML = paragraphs.length
                ? paragraphs.map(p => `<p>${p}</p>`).join('')
                : '';

            if (!quizResult.ok) throw new Error(quizResult.error || '퀴즈 생성 실패');
            questions = Array.isArray(quizResult.questions) ? quizResult.questions : [];

            if (questions.length === 0) {
                questionText.textContent = '문제가 없습니다. 다시 시도해 주세요.';
                submitBtn.disabled = true;
                return;
            }

            // 쿼리 인덱스 → 현재 문제
            const parsedIndex = Number(initialIndexParam);
            if (!Number.isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < questions.length) {
                currentQuestionIndex = parsedIndex;
            } else {
                currentQuestionIndex = 0;
            }

            // 첫 문제라면 통계 초기화
            if (currentQuestionIndex === 0) {
                try {
                    const stats = { fileId, total: questions.length, correct: 0, wrong: 0, startTs: Date.now() };
                    sessionStorage.setItem(`quizStats:${fileId}`, JSON.stringify(stats));
                } catch {}
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

        const correctIndex = Number(question.answerIndex);

        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `<span class="check-icon">✔</span><span>${choice}</span>`;
            
            button.dataset.correct = String(index === correctIndex);
            button.dataset.index = String(index);
            
            // index 전달 ❌ → dataset 사용 ✅
            button.addEventListener('click', (e) => handleOptionSelect(e.currentTarget));
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
        
        const question = questions[currentQuestionIndex];
        const correctIndex = Number(question.answerIndex);
        const selected = Number(button.dataset.index);
        
        console.log("=== 디버깅 정보 ===");
        console.log("선택한 인덱스 (0부터):", selected, "타입:", typeof selected);
        console.log("선택한 번호 (1부터):", selected + 1);
        console.log("원본 answerIndex:", question.answerIndex, "타입:", typeof question.answerIndex);
        console.log("정답 인덱스 (0부터):", correctIndex, "타입:", typeof correctIndex);
        console.log("정답 번호 (1부터):", correctIndex + 1);
        console.log("선택지들:", question.choices);
        console.log("정답 선택지:", question.choices[correctIndex]);
        console.log("비교 결과 (selected === correctIndex):", selected === correctIndex);
        console.log("==================");
        
        if (selected === correctIndex) {
            alert("정답");
        } else {
            alert("오답");
        }
    }

    submitBtn.addEventListener('click', () => {
        if (!selectedButton) return;
        const isCorrect = selectedButton.dataset.correct === 'true';

        const fileId = new URLSearchParams(window.location.search).get('fileId');
        const current = questions[currentQuestionIndex] || {};
        const nextIndex = currentQuestionIndex + 1;

        try {
            sessionStorage.setItem('quizFeedback', current.explanation || '');
            sessionStorage.setItem('fileId', fileId || '');
            sessionStorage.setItem('nextQuestionIndex', String(nextIndex));
            // 통계 업데이트
            const key = `quizStats:${fileId}`;
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const stats = JSON.parse(raw);
                if (isCorrect) stats.correct = (stats.correct || 0) + 1;
                else stats.wrong = (stats.wrong || 0) + 1;
                sessionStorage.setItem(key, JSON.stringify(stats));
            }
        } catch (e) {
            // 세션 저장 실패 무시
        }

        const isLast = nextIndex >= questions.length;
        if (isCorrect && isLast) {
            window.location.href = 'solvecomplete.html';
            return;
        }

        window.location.href = isCorrect ? 'right.html' : 'wrong.html';
    });

    initialize();
});
