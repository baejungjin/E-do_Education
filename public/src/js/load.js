document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.querySelector('.file-list');
    const fileInput = document.getElementById('new-file-upload');
    const fileItemTemplate = document.getElementById('file-item-template');
    const BASE_URL = 'https://e-do.onrender.com';

    // --- 기존 아이템 처리 (애니메이션, 삭제 등) ---
    // (이전 코드와 동일)

    // --- 새 파일 업로드 처리 ---
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
        event.target.value = null;
    });

    async function handleFileUpload(file) {
        const tempId = `temp-${Date.now()}`;
        // 1. 낙관적 UI 업데이트: 먼저 화면에 아이템을 추가하고 "업로드 중..."으로 표시
        const newItemEl = addFileToList(file.name, tempId, "업로드 중...");

        // 2. 서버에 파일 업로드
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || '업로드 실패');
            }

            // 3. 성공 시: fileId로 링크 업데이트
            updateFileItem(newItemEl, result.fileId, "업로드 완료");

        } catch (error) {
            console.error('Upload failed:', error);
            // 4. 실패 시: 에러 메시지 표시
            updateFileItem(newItemEl, null, `실패: ${error.message}`, true);
        }
    }
    
    function addFileToList(fileName, fileId, statusText) {
        const templateClone = fileItemTemplate.content.cloneNode(true);
        const newItemEl = templateClone.querySelector('.file-item');
        newItemEl.dataset.id = fileId;

        newItemEl.querySelector('.file-name').textContent = fileName;
        newItemEl.querySelector('.file-date').textContent = statusText;

        addDeleteFunctionality(newItemEl.querySelector('.delete-btn'));
        fileList.appendChild(newItemEl);
        
        setTimeout(() => newItemEl.classList.add('visible'), 10);
        return newItemEl;
    }

    function updateFileItem(item, fileId, statusText, isError = false) {
        item.querySelector('.file-date').textContent = statusText;
        if (isError) {
            item.classList.add('error');
        } else if (fileId) {
            addNavigationFunctionality(item, fileId);
        }
    }

    function addDeleteFunctionality(button) { /* 이전과 동일 */ }
    function addNavigationFunctionality(item, fileId) {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `read.html?fileId=${fileId}`;
        });
    }
    
    // 기존 아이템에도 기능 할당
    // ... (이전 코드)
});