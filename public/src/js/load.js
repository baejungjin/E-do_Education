document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.querySelector('.file-list');
    const fileInput = document.getElementById('new-file-upload');
    const fileItemTemplate = document.getElementById('file-item-template');
    const BASE_URL = 'https://e-do.onrender.com';

    // --- 초기 요소 애니메이션 및 기능 할당 ---
    document.querySelectorAll('.anim-on-load').forEach((el, index) => {
        setTimeout(() => el.classList.add('visible'), 100 + index * 100);
    });
    document.querySelectorAll('.file-item').forEach(item => {
        addDeleteFunctionality(item.querySelector('.delete-btn'));
        // 기존 아이템은 이미 fileId가 있다고 가정하고 링크를 설정하거나, 혹은 클릭 시 API를 호출해야 함
        // 여기서는 새 업로드에 집중
    });

    // --- 새 파일 업로드 처리 ---
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
        event.target.value = null;
    });

    async function handleFileUpload(file) {
        const tempId = `temp-${Date.now()}`;
        const newItemEl = addFileToList(file.name, tempId, "업로드 중...");

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '서버 응답 오류');

            updateFileItem(newItemEl, result.fileId, "업로드 완료");

        } catch (error) {
            console.error('Upload failed:', error);
            updateFileItem(newItemEl, null, `업로드 실패`, true);
        }
    }

    // --- UI 업데이트 및 기능 할당 함수 ---
    function addFileToList(fileName, id, statusText) {
        const templateClone = fileItemTemplate.content.cloneNode(true);
        const newItemEl = templateClone.querySelector('.file-item');
        newItemEl.dataset.id = id;
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
            // 1. localStorage에 fileId 저장
            localStorage.setItem('currentFileId', fileId);
            // 2. study.html로 이동
            window.location.href = `study.html?fileId=${fileId}`;
        }
    }

    function addDeleteFunctionality(button) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const itemToRemove = button.closest('.file-item');
            itemToRemove.classList.remove('visible');
            setTimeout(() => itemToRemove.remove(), 500);
        });
    }

    function addNavigationFunctionality(item, fileId) {
        item.href = `read.html?fileId=${fileId}`;
        item.addEventListener('click', (e) => {
            // a 태그의 기본 동작을 그대로 사용
        });
    }
});