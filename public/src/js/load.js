document.addEventListener('DOMContentLoaded', () => {
    // --- 요소 가져오기 ---
    const fileList = document.querySelector('.file-list');
    const fileInput = document.getElementById('new-file-upload');
    const fileItemTemplate = document.getElementById('file-item-template');

    // --- 1. 페이지 로드 시 초기 요소 처리 ---
    // 모든 애니메이션 대상 요소를 찾아 화면에 표시
    const animatedElements = document.querySelectorAll('.anim-on-load');
    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('visible');
        }, 100 + index * 100);
    });

    // 기존에 있던 항목들에 기능(삭제, 이동) 추가
    const existingItems = document.querySelectorAll('.file-item');
    existingItems.forEach(item => {
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            addDeleteFunctionality(deleteBtn);
        }
        const fileName = item.querySelector('.file-name').textContent;
        addNavigationFunctionality(item, fileName);
    });

    // --- 2. 새 파일 업로드 이벤트 처리 ---
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
        event.target.value = null; // 같은 파일 다시 선택 가능하도록 초기화
    });

    // --- 3. 기능 함수들 ---
    function handleFileUpload(file) {
        if (!fileItemTemplate) {
            console.error('File item template not found!');
            return;
        }
        const fileName = file.name;
        const today = new Date();
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const templateClone = fileItemTemplate.content.cloneNode(true);
        const newItemEl = templateClone.querySelector('.file-item');

        newItemEl.querySelector('.file-name').textContent = fileName;
        newItemEl.querySelector('.file-date').textContent = dateString;

        addDeleteFunctionality(newItemEl.querySelector('.delete-btn'));
        addNavigationFunctionality(newItemEl, fileName);

        fileList.appendChild(newItemEl);

        // 방금 추가된 아이템에 애니메이션 적용
        setTimeout(() => {
            newItemEl.classList.add('visible');
        }, 10);
    }

    function addDeleteFunctionality(button) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const itemToRemove = button.closest('.file-item');
            itemToRemove.classList.remove('visible'); // fade-out
            setTimeout(() => itemToRemove.remove(), 500); // 애니메이션 후 삭제
        });
    }

    function addNavigationFunctionality(item, fileName) {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: 실제 파일 업로드 후 받은 fileId로 교체해야 합니다.
            window.location.href = `read.html?file=${encodeURIComponent(fileName)}`;
        });
    }
});