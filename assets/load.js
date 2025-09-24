document.addEventListener('DOMContentLoaded', () => {
    // 1. HTML의 주요 요소들을 미리 찾아 변수에 담아둡니다.
    const fileListContainer = document.querySelector('.file-list');
    const fileUploadInput = document.getElementById('new-file-upload');
    const fileItemTemplate = document.getElementById('file-item-template');

    // API 서버의 기본 주소입니다.
    const BASE_URL = 'https://e-do.onrender.com';

    /**
     * 2. 사용자가 파일을 선택했을 때 실행될 함수를 연결합니다.
     * 'change' 이벤트는 input[type="file"]에서 파일이 선택되면 발생합니다.
     */
    fileUploadInput.addEventListener('change', (event) => {
        // 사용자가 선택한 파일 가져오기 (첫 번째 파일만)
        const selectedFile = event.target.files[0];

        // 파일이 선택되었다면, 서버로 업로드하는 함수를 호출합니다.
        if (selectedFile) {
            uploadFile(selectedFile);
        }
    });

    /**
     * 3. 파일을 서버에 전송(업로드)하는 함수
     * @param {File} file - 사용자가 선택한 파일 객체
     */
    async function uploadFile(file) {
        // 'multipart/form-data' 형식으로 데이터를 보내기 위해 FormData 객체를 생성합니다.
        const formData = new FormData();
        // API 명세서에 따라 'file'이라는 키(key)로 파일 데이터를 추가합니다.
        formData.append('file', file);

        try {
            // fetch API를 사용해 서버에 POST 요청을 보냅니다.
            const response = await fetch(`${BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData, // FormData를 body에 담아 전송
            });

            // 서버 응답이 성공적이지 않으면 에러를 발생시킵니다.
            if (!response.ok) {
                throw new Error('파일 업로드에 실패했습니다.');
            }

            // 서버가 보내준 JSON 데이터를 파싱(해석)합니다.
            const result = await response.json();
            console.log('서버 응답:', result);

            // API 응답의 ok가 true이면, 화면에 파일을 추가하는 함수를 호출합니다.
            if (result.ok) {
                addFileToList(result);
            } else {
                alert(`업로드 실패: ${result.error}`);
            }

        } catch (error) {
            // 네트워크 오류 등 요청 중 에러가 발생하면 알려줍니다.
            console.error('업로드 중 에러 발생:', error);
            alert('파일 업로드 중 문제가 발생했습니다.');
        }
    }

    /**
     * 4. 서버로부터 받은 파일 정보를 화면 목록에 추가하는 함수
     * @param {object} fileData - 서버가 응답으로 보내준 파일 정보 (예: { filename, fileld, ... })
     */
    function addFileToList(fileData) {
        // HTML의 <template> 태그를 복사해서 새로운 파일 아이템을 만듭니다.
        const newFileItemFragment = fileItemTemplate.content.cloneNode(true);
        const newFileItem = newFileItemFragment.querySelector('.uploaded-file-item');

        // fileId를 data 속성으로 저장합니다. API 명세에 'fileld'로 되어있으므로 그대로 사용합니다.
        newFileItem.dataset.fileId = fileData.fileld;

        // 복사한 아이템 안에서 클래스 이름으로 각 요소를 찾습니다.
        const fileNameElement = newFileItem.querySelector('.file-name');
        const fileDateElement = newFileItem.querySelector('.file-date');

        // 서버에서 받은 파일 이름과 현재 날짜로 내용을 채웁니다.
        fileNameElement.textContent = fileData.filename;
        const today = new Date();
        // 날짜를 YYYY-MM-DD 형식으로 이쁘게 만듭니다.
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        fileDateElement.textContent = `업로드 날짜: ${formattedDate}`;

        // 완성된 새 아이템을 화면의 파일 목록 컨테이너에 추가합니다.
        fileListContainer.appendChild(newFileItemFragment);
    }

    // 5. 파일 목록의 아이템 클릭 이벤트 처리
    fileListContainer.addEventListener('click', (event) => {
        const item = event.target.closest('.uploaded-file-item');
        if (!item) return;

        // 삭제 버튼을 눌렀을 경우
        if (event.target.classList.contains('delete-btn')) {
            // 여기에 삭제 API 호출 로직을 추가할 수 있습니다. (지금은 화면에서만 제거)
            item.remove();
        } else {
            // 파일 아이템 자체를 눌렀을 경우
            const fileId = item.dataset.fileId;
            if (fileId) {
                window.location.href = `read.html?fileId=${fileId}`;
            } else {
                console.error('fileId를 찾을 수 없습니다.');
            }
        }
    });
});