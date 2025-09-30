document.addEventListener('DOMContentLoaded', () => {
    // --- 기존 OCR 관련 요소 ---
    const passageContent = document.querySelector('.passage-content');
    const passageTitle = document.querySelector('.passage-title');
    
    // --- 새로운 STT 관련 요소 ---
    const micButton = document.getElementById('mic-button');
    const sttStatus = document.getElementById('stt-status');
    const sttPreview = document.getElementById('stt-preview');
    const sttLog = document.getElementById('stt-log');
    const doneButton = document.getElementById('done-button');

    // --- 상태 변수 ---
    const BASE_URL = 'https://e-do.onrender.com';
    const STT_URL = 'wss://e-do.onrender.com/stt';
    let fileId = new URLSearchParams(window.location.search).get('fileId');
    
    let socket;
    let mediaRecorder;
    let mediaStream;
    let isRecording = false;
    let finalTranscripts = [];

    // --- 초기화 ---
    if (fileId) {
        fetchOcrText(fileId);
        initializeMicrophone();
        // "다 읽었어요" 버튼에 fileId 추가
        doneButton.href = `readwell.html?fileId=${fileId}`;
    } else {
        passageContent.textContent = '오류: 파일 ID를 찾을 수 없습니다.';
        sttStatus.textContent = '파일 ID가 없어 시작할 수 없습니다.';
        console.error('File ID not found in URL');
    }

    // 1. 마이크 초기화 및 권한 요청
    async function initializeMicrophone() {
        sttStatus.textContent = '마이크 권한을 요청합니다...';
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            sttStatus.textContent = '마이크가 준비되었습니다. 버튼을 눌러 녹음을 시작하세요.';
            micButton.addEventListener('click', toggleRecording);
        } catch (error) {
            sttStatus.textContent = '마이크 권한이 거부되었습니다. 설정에서 허용해주세요.';
            console.error('마이크 권한 오류:', error);
        }
    }

    // 2. 녹음 시작/종료 토글
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    // 3. 녹음 시작 처리
    function startRecording() {
        if (!mediaStream) {
            sttStatus.textContent = '마이크를 사용할 수 없습니다.';
            return;
        }

        isRecording = true;
        finalTranscripts = []; // 이전 기록 초기화
        sttLog.innerHTML = ''; // UI 초기화
        sttPreview.textContent = '...';
        sttStatus.textContent = '서버에 연결 중...';
        micButton.style.backgroundColor = '#FF6B6B'; // 녹음 중 색상 변경

        socket = new WebSocket(STT_URL);

        socket.onopen = () => {
            sttStatus.textContent = '연결 성공! 녹음 중...';
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' });

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    const arrayBuffer = await event.data.arrayBuffer();
                    socket.send(arrayBuffer);
                }
            };

            mediaRecorder.onstop = () => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'stop' }));
                }
                // 서버가 연결을 닫도록 둡니다.
            };
            
            mediaRecorder.start(250); // 250ms 간격으로 데이터 전송
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'transcript':
                    if (data.final) {
                        sttPreview.textContent = '...';
                        const p = document.createElement('p');
                        p.textContent = data.text;
                        p.style.margin = '0 0 5px 0';
                        sttLog.appendChild(p);
                        finalTranscripts.push(data.text);
                        checkSimilarity();
                    } else {
                        sttPreview.textContent = data.text;
                    }
                    break;
                case 'error':
                    sttStatus.textContent = `오류: ${data.message}`;
                    console.error('STT 오류:', data.message);
                    stopRecording();
                    break;
            }
        };

        socket.onerror = (error) => {
            sttStatus.textContent = 'WebSocket 오류가 발생했습니다.';
            console.error('WebSocket 오류:', error);
            stopRecording();
        };

        socket.onclose = (event) => {
            sttStatus.textContent = '연결이 종료되었습니다. 다시 시도하세요.';
            console.log('WebSocket 닫힘:', event);
            if (isRecording) {
                stopRecording(); // 예기치 않게 닫혔을 경우 정리
            }
        };
    }

    // 4. 녹음 중지 처리
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        // onstop 핸들러가 stop 메시지를 보낼 것입니다.
        
        isRecording = false;
        sttStatus.textContent = '녹음이 중지되었습니다. 다시 시작하려면 버튼을 누르세요.';
        micButton.style.backgroundColor = '#AEE5D8'; // 원래 색상으로 복원
        mediaRecorder = null;
        // 소켓은 서버에 의해 닫히거나 onclose 핸들러에서 정리됩니다.
    }

    // 5. 텍스트 유사도 검사 및 버튼 활성화
    function checkSimilarity() {
        const originalText = passageContent.innerText.trim();
        const transcribedText = finalTranscripts.join(' ').trim();

        if (originalText.length === 0 || transcribedText.length === 0) return;

        const similarity = calculateSimilarity(originalText, transcribedText);
        console.log(`유사도: ${similarity}%`);

        if (similarity >= 60) {
            doneButton.style.backgroundColor = '#FFD6E0'; // 활성화 색상
            doneButton.style.cursor = 'pointer';
            doneButton.style.pointerEvents = 'auto';
            sttStatus.textContent = '유사도 60% 이상! 다음으로 진행할 수 있습니다.';
        }
    }

    /**
     * Levenshtein 거리 계산을 통한 유사도 측정
     * @param {string} str1
     * @param {string} str2
     * @returns {number} 유사도 (0-100)
     */
    function calculateSimilarity(str1, str2) {
        const distance = levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 100;
        const similarity = (1 - distance / maxLength) * 100;
        return similarity;
    }

    function levenshteinDistance(a, b) {
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
        for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
        for (let j = 1; j <= b.length; j += 1) {
            for (let i = 1; i <= a.length; i += 1) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,      // deletion
                    matrix[j - 1][i] + 1,      // insertion
                    matrix[j - 1][i - 1] + indicator, // substitution
                );
            }
        }
        return matrix[b.length][a.length];
    }

    // --- 기존 OCR 텍스트 로딩 함수 ---
    async function fetchOcrText(id) {
        passageTitle.textContent = '텍스트 변환 중...';
        passageContent.textContent = '지문을 불러오는 중입니다...';
        try {
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: id }),
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            const result = await response.json();
            if (result.ok) {
                passageTitle.textContent = '오늘의 지문';
                passageContent.innerHTML = formatOcrText(result.fullText);
            } else {
                throw new Error(result.error || '알 수 없는 오류');
            }
        } catch (error) {
            passageTitle.textContent = '오류 발생';
            passageContent.textContent = `지문을 불러오는 데 실패했습니다: ${error.message}`;
            console.error('OCR Fetch Error:', error);
        }
    }

    function formatOcrText(text) {
        const singleLineText = text.replace(/(\r\n|\n|\r)/gm, " ").trim();
        const sentences = singleLineText.match(/[^.!?]+[.!?]+(\s+|$)/g);
        if (!sentences) {
            return `<p>${singleLineText}</p>`;
        }
        return sentences.map(sentence => `<p>${sentence.trim()}</p>`).join('');
    }
});