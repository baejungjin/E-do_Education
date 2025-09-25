document.addEventListener('DOMContentLoaded', () => {
    const passageContent = document.querySelector('.passage-content');
    const passageTitle = document.querySelector('.passage-title');

    const doneButton = document.querySelector('.done-button');

    // 1. URL에서 fileId를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');

    // "다 읽었어요" 버튼에 fileId를 추가합니다.
    if (fileId) {
        doneButton.href = `readwell.html?fileId=${fileId}`;
    }

    const BASE_URL = 'https://e-do.onrender.com';

    // 2. fileId가 있으면 OCR API를 호출하는 함수를 실행합니다.
    if (fileId) {
        fetchOcrText(fileId);
    } else {
        passageContent.textContent = '오류: 파일 ID를 찾을 수 없습니다. 이전 페이지로 돌아가 다시 시도해주세요.';
        console.error('File ID not found in URL');
    }

    /**
     * OCR 텍스트를 문단으로 변환하는 함수
     * @param {string} text - 원본 텍스트
     * @returns {string} HTML 형식의 문단
     */
    function formatOcrText(text) {
        // 1. 모든 종류의 줄바꿈을 공백으로 변환하여 정규화합니다.
        const singleLineText = text.replace(/(\r\n|\n|\r)/gm, " ").trim();

        // 2. 텍스트를 문장 단위로 나눕니다. 이 정규식은 문장 끝 구두점(.!?) 뒤에 공백이 오거나 문자열의 끝인 경우를 찾습니다.
        const sentences = singleLineText.match(/[^.!?]+[.!?]+(\s+|$)/g);

        // 정규식이 문장을 찾지 못하면, 전체 텍스트를 하나의 <p> 태그에 넣습니다.
        if (!sentences) {
            return `<p>${singleLineText}</p>`;
        }

        // 3. 각 문장을 <p> 태그로 감싸고 합칩니다.
        return sentences.map(sentence => `<p>${sentence.trim()}</p>`).join('');
    }

    /**
     * 3. 서버에 OCR을 요청하고 결과를 받아 화면에 표시하는 함수
     * @param {string} id - 업로드된 파일의 ID
     */
    async function fetchOcrText(id) {
        // 사용자에게 로딩 중임을 알립니다.
        passageTitle.textContent = '텍스트 변환 중...';
        passageContent.textContent = '지문을 불러오는 중입니다. 잠시만 기다려주세요...';

        try {
            const response = await fetch(`${BASE_URL}/api/ocr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // API 명세에 따라 'fileId' 키로 ID를 보냅니다.
                body: JSON.stringify({ fileId: id }),
            });

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status}`);
            }

            const result = await response.json();

            console.log('서버로부터 받은 OCR 응답:', result); // 서버 응답 전체를 로그에 출력

            if (result.ok) {
                // 성공 시, 제목과 지문 내용을 업데이트합니다.
                passageTitle.textContent = '오늘의 지문';
                // API 응답의 'fullText' 필드를 화면에 맞게 포맷팅합니다.
                passageContent.innerHTML = formatOcrText(result.fullText);
            } else {
                // API가 ok: false를 반환한 경우
                throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
            }

        } catch (error) {
            // 네트워크 오류 또는 API 처리 중 발생한 오류를 화면에 표시합니다.
            passageTitle.textContent = '오류 발생';
            passageContent.textContent = `지문을 불러오는 데 실패했습니다: ${error.message}`;
            console.error('OCR Fetch Error:', error);
        }
    }
});
