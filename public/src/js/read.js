document.addEventListener('DOMContentLoaded', () => {
    const passageDisplay = document.getElementById('passage-display');
    const micBtn = document.getElementById('mic-btn');
    const voiceText = document.getElementById('voice-text');
    const noticeText = document.getElementById('notice-text');
    const doneBtn = document.getElementById('done-btn');
    const judgeSkipToQuizBtn = document.getElementById('judge-skip-to-quiz-btn');

    const BASE_URL = 'https://e-do.onrender.com';
    const STT_URL = 'wss://e-do.onrender.com/stt';
    let sentences = [];
    let currentIndex = -1;
    let isRecording = false;
    let mediaStream = null;
    let mediaRecorder = null;
    let socket = null;
    let accumulatedText = '';
    let silenceTimeout = null;
    let fileId = null;

    async function initialize() {
        fileId = new URLSearchParams(window.location.search).get('fileId');
        if (!fileId) {
            passageDisplay.innerHTML = '<p style="color:red;">파일 ID를 찾을 수 없습니다.</p>';
            return;
        }

        judgeSkipToQuizBtn.href = `problemsolve.html?fileId=${fileId}`;
        doneBtn.addEventListener('click', () => window.location.href = `problemsolve.html?fileId=${fileId}`);

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            micBtn.disabled = true;
            noticeText.textContent = '⚠️ 마이크 권한을 허용해주세요.';
            return;
        }

        const res = await fetch(`${BASE_URL}/api/ocr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId })
        });
        const data = await res.json();
        const text = normalizeOcrLineBreaks(data.fullText || data.preview || '');
        setupSentences(text);
    }

    function normalizeOcrLineBreaks(raw) {
        return raw.replace(/\r/g, '').split(/\n{2,}/)
            .map(p => p.replace(/\n+/g, ' ').trim())
            .filter(Boolean).join('\n\n');
    }

    function setupSentences(text) {
        sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
        passageDisplay.innerHTML = '';
        sentences.forEach(s => {
            const el = document.createElement('span');
            el.className = 'sentence';
            el.textContent = s.trim();
            passageDisplay.appendChild(el);
        });
        showNextSentence();
        micBtn.addEventListener('click', toggleRecording);
    }

    function showNextSentence() {
        if (currentIndex >= sentences.length - 1) {
            voiceText.textContent = '✅ 모든 문장을 다 읽었습니다.';
            doneBtn.disabled = false;
            noticeText.textContent = '👏 잘하셨어요! 아래 버튼으로 넘어가세요.';
            return;
        }
        currentIndex++;
        accumulatedText = '';
        updateVoiceText('');
        updateSentenceStyles();
        noticeText.textContent = '🎧 마이크를 눌러 녹음을 시작하세요';
    }

    function updateSentenceStyles() {
        passageDisplay.querySelectorAll('.sentence').forEach((el, i) => {
            el.classList.remove('current');
            if (i === currentIndex) el.classList.add('current');
        });
        passageDisplay.querySelector('.sentence.current')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function toggleRecording() {
        if (isRecording) stopRecording();
        else startRecording();
    }

    function startRecording() {
        if (isRecording) return;
        if (socket && socket.readyState !== WebSocket.CLOSED) socket.close(1000, '재시작');
        isRecording = true;
        micBtn.classList.add('recording');
        noticeText.textContent = '🎙️ 읽는 중입니다...';
        accumulatedText = '';
        voiceText.textContent = '음성을 인식 중...';

        socket = new WebSocket(STT_URL);
        socket.onopen = () => {
            mediaRecorder = new MediaRecorder(mediaStream, {
                mimeType: 'audio/webm',
                audioBitsPerSecond: 128000
            });
            mediaRecorder.ondataavailable = e => {
                if (socket.readyState === WebSocket.OPEN && e.data.size > 0) socket.send(e.data);
            };
            mediaRecorder.start(500);
        };

        socket.onmessage = e => {
            if (!isRecording) return;
            const data = JSON.parse(e.data);
            if (data.type === 'transcript' && data.text) {
                accumulatedText = data.text.trim();
                updateVoiceText(accumulatedText);
                resetSilenceTimeout();
            }
        };

        socket.onerror = () => stopRecording();
        socket.onclose = () => stopRecording();
    }

    function stopRecording() {
        if (!isRecording) return;
        isRecording = false;
        micBtn.classList.remove('recording');
        clearTimeout(silenceTimeout);
        if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
        if (socket?.readyState === WebSocket.OPEN) socket.close(1000, '정상 종료');
        if (accumulatedText.length > 0) checkSimilarity(accumulatedText);
    }

    function resetSilenceTimeout() {
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
            if (isRecording) stopRecording();
        }, 2500);
    }

    function normalizeText(t) {
        return (t || '').toLowerCase().replace(/\s+/g, '')
            .replace(/[.,!?"'`~:;\-()[\]{}…·]/g, '');
    }

    function levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m * n === 0) return Math.max(m, n);
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }

    function similarity(a, b) {
        const maxLen = Math.max(a.length, b.length) || 1;
        return 1 - levenshtein(a, b) / maxLen;
    }

    function checkSimilarity(spoken) {
        const original = sentences[currentIndex].trim();
        const normO = normalizeText(original);
        const normS = normalizeText(spoken);
        const ratio = similarity(normO, normS);
        const lengthRatio = normS.length / normO.length;

        if (ratio >= 0.6 && lengthRatio >= 0.7) {
            voiceText.textContent = '✅ 잘 읽었어요!';
            noticeText.textContent = '👍 자동으로 다음 문장으로 넘어갑니다';
            setTimeout(() => showNextSentence(), 1200);
        } else {
            noticeText.textContent = '🔁 다시 읽어주세요';
        }
    }

    function updateVoiceText(text) {
        voiceText.textContent = text || '';
        voiceText.scrollTop = voiceText.scrollHeight;
    }

    initialize();
});
