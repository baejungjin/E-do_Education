document.addEventListener('DOMContentLoaded', async () => {
    const passageContent = document.querySelector('.passage-content');
    const questionText = document.querySelector('.question-text');
    const optionsContainer = document.querySelector('.options-container');
    const submitBtn = document.getElementById('submit-btn');
    const BASE_URL = 'https://e-do.onrender.com';

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedButton = null;

    // --- 로딩 오버레이 ---
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
        overlay.querySelector('.loading-text').textContent = message || '문제를 불러오는 중...';
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

    // --- 초기화 ---
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

            // OCR 요청
            const ocrPromise = fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId })
            }).then(res => res.json());

            // 퀴즈 요청 (캐시 확인)
            let cached = null;
            try {
                const raw = sessionStorage.getItem(`quizCache:${fileId}`);
                if (raw) cached = JSON.parse(raw);
            } catch {}

            let quizResult;
            if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
                // 캐시된 문제도 유효성 검사
                const validCachedQuestions = cached.questions.filter(q => {
                    return q && 
                        q.question && 
                        Array.isArray(q.choices) && 
                        q.choices.length > 0 &&
                        q.choices.every(choice => choice && choice.trim().length > 0);
                });
                
                if (validCachedQuestions.length > 0) {
                    quizResult = { ok: true, questions: validCachedQuestions };
                    console.log('캐시된 문제 사용:', validCachedQuestions.length, '개');
                } else {
                    console.warn('캐시된 문제가 유효하지 않음, 새로 요청');
                    cached = null; // 캐시 무효화
                }
            }
            
            if (!quizResult) {
                quizResult = await fetch(`${BASE_URL}/api/quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId, level: '초급', style: '지문 이해' })
                }).then(res => res.json());
                if (quizResult.ok && Array.isArray(quizResult.questions)) {
                    try {
                        sessionStorage.setItem(`quizCache:${fileId}`, JSON.stringify({
                            fileId,
                            questions: quizResult.questions,
                            ts: Date.now()
                        }));
                    } catch {}
                }
            }

            const ocrResult = await ocrPromise;
            if (!ocrResult.ok) throw new Error(ocrResult.error || '지문 로딩 실패');

            const raw = (ocrResult.fullText || ocrResult.preview || '');
            const paragraphs = normalizeOcrLineBreaks(raw);
            passageContent.innerHTML = paragraphs.length
                ? paragraphs.map(p => `<p>${p}</p>`).join('')
                : '';

            if (!quizResult.ok) {
                console.error('퀴즈 생성 실패:', quizResult);
                throw new Error(quizResult.error || '퀴즈 생성 실패');
            }
            
            questions = Array.isArray(quizResult.questions) ? quizResult.questions : [];
            console.log('생성된 문제 수:', questions.length);

            if (questions.length === 0) {
                questionText.textContent = '문제가 없습니다. 다시 시도해 주세요.';
                optionsContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">문제를 생성할 수 없습니다.</p>';
                submitBtn.disabled = true;
                return;
            }

            // 각 문제의 유효성 검사
            const validQuestions = questions.filter(q => {
                const isValid = q && 
                    q.question && 
                    Array.isArray(q.choices) && 
                    q.choices.length > 0 &&
                    q.choices.every(choice => choice && choice.trim().length > 0);
                
                if (!isValid) {
                    console.warn('유효하지 않은 문제:', q);
                }
                return isValid;
            });

            if (validQuestions.length === 0) {
                questionText.textContent = '유효한 문제가 없습니다. 다시 시도해 주세요.';
                optionsContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">문제 데이터가 올바르지 않습니다.</p>';
                submitBtn.disabled = true;
                return;
            }

            if (validQuestions.length < questions.length) {
                console.warn(`${questions.length - validQuestions.length}개의 문제가 유효하지 않아 제외되었습니다.`);
                questions = validQuestions;
            }

            // 인덱스 세팅
            const parsedIndex = Number(initialIndexParam);
            if (!Number.isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < questions.length) {
                currentQuestionIndex = parsedIndex;
            } else {
                currentQuestionIndex = 0;
            }

            // 통계 초기화
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
            console.error('문제 로딩 오류:', error);
            questionText.textContent = `오류: ${error.message}`;
            optionsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: red; margin-bottom: 15px;">문제를 불러오는 중 오류가 발생했습니다.</p>
                    <button onclick="location.reload()" style="
                        background: #42A5F5; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: bold;
                    ">새로고침</button>
                </div>
            `;
            submitBtn.disabled = true;
        }
    }

    // --- 문제 표시 ---
    function displayQuestion() {
        const question = questions[currentQuestionIndex];
        if (!question) {
            questionText.textContent = '문제를 불러올 수 없습니다.';
            return;
        }

        // 문제 데이터 유효성 검사
        if (!question.question || !Array.isArray(question.choices) || question.choices.length === 0) {
            console.error('잘못된 문제 데이터:', question);
            questionText.textContent = '문제 데이터가 올바르지 않습니다. 새로고침해주세요.';
            optionsContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">문제 데이터 오류</p>';
            submitBtn.disabled = true;
            return;
        }

        questionText.textContent = `Q${currentQuestionIndex + 1}. ${question.question}`;
        optionsContainer.innerHTML = '';
        selectedButton = null;
        submitBtn.disabled = true;

        // 안전하게 정답 인덱스 파싱
        let correctIndex = parseInt(question.answerIndex, 10);
        if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= question.choices.length) {
            // 백엔드가 잘못 내려주면 answerText로 찾기
            if (question.answerText) {
                correctIndex = question.choices.findIndex(c => c.trim() === question.answerText.trim());
            }
            // 여전히 유효하지 않으면 0으로 설정 (첫 번째 선택지)
            if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= question.choices.length) {
                correctIndex = 0;
                console.warn('정답 인덱스를 찾을 수 없어 첫 번째 선택지를 정답으로 설정합니다.');
            }
        }

        question.choices.forEach((choice, index) => {
            // 선택지가 빈 문자열이거나 null인 경우 처리
            const choiceText = choice || `선택지 ${index + 1}`;
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `<span class="check-icon">✔</span><span>${choiceText}</span>`;
            button.dataset.correct = (index === correctIndex).toString();
            button.dataset.index = index.toString();

            button.addEventListener('click', () => handleOptionSelect(button));
            optionsContainer.appendChild(button);
        });
    }

    // --- 선택 처리 ---
    function handleOptionSelect(button) {
        if (selectedButton) {
            selectedButton.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedButton = button;
        submitBtn.disabled = false;
        
        // 디버깅 로그 추가
        const question = questions[currentQuestionIndex];
        const selectedIndex = parseInt(button.dataset.index, 10);
        const correctIndex = parseInt(question.answerIndex, 10);
        
        console.log("=== 선택 디버깅 ===");
        console.log("선택한 인덱스:", selectedIndex);
        console.log("정답 인덱스:", correctIndex);
        console.log("선택한 번호 (1부터):", selectedIndex + 1);
        console.log("정답 번호 (1부터):", correctIndex + 1);
        console.log("원본 answerIndex:", question.answerIndex);
        console.log("비교 결과:", selectedIndex === correctIndex);
        console.log("==================");
    }

    // --- 제출 처리 ---
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

            const key = `quizStats:${fileId}`;
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const stats = JSON.parse(raw);
                if (isCorrect) stats.correct = (stats.correct || 0) + 1;
                else stats.wrong = (stats.wrong || 0) + 1;
                sessionStorage.setItem(key, JSON.stringify(stats));
            }
        } catch {}

        const isLast = nextIndex >= questions.length;
        if (isCorrect && isLast) {
            window.location.href = 'solvecomplete.html';
            return;
        }

        window.location.href = isCorrect ? 'right.html' : 'wrong.html';
    });

    initialize();
});