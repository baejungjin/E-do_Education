document.addEventListener('DOMContentLoaded', () => {
    const passageContent = document.querySelector('.passage-content');
    const passageTitle = document.querySelector('.passage-title');

    // 1. URL에서 fileId를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');

    const BASE_URL = 'https://e-do.onrender.com';

    // 2. fileId가 있으면 OCR API를 호출하는 함수를 실행합니다.
    if (fileId) {
        fetchOcrText(fileId);
    } else {
        passageContent.textContent = '오류: 파일 ID를 찾을 수 없습니다. 이전 페이지로 돌아가 다시 시도해주세요.';
        console.error('File ID not found in URL');
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

            if (result.ok) {
                // 성공 시, 제목과 지문 내용을 업데이트합니다.
                passageTitle.textContent = '오늘의 지문';
                // API 응답의 'preview' 필드를 사용합니다.
                passageContent.textContent = result.preview;
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
