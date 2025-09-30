document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.querySelector('.file-list');
    const fileInput = document.getElementById('new-file-upload');
    const fileItemTemplate = document.getElementById('file-item-template');

    // --- 1. 페이지 로드 시 기존 아이템 처리 ---
    const existingItems = document.querySelectorAll('.file-item');
    const animatedElements = document.querySelectorAll('.anim-on-load');

    // 애니메이션 적용
    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('visible');
        }, 100 + index * 100);
    });

    // 삭제 버튼 기능 할당
    document.querySelectorAll('.delete-btn').forEach(btn => {
        addDeleteFunctionality(btn);
    });

    // --- 2. 새 파일 업로드 처리 ---
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
        event.target.value = null; // 같은 파일 다시 선택 가능하도록 초기화
    });

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

    // --- 3. 공통 기능 함수 ---
    function addDeleteFunctionality(button) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const itemToRemove = button.closest('.file-item');
            
            itemToRemove.classList.remove('visible'); // fade-out 애니메이션
            setTimeout(() => itemToRemove.remove(), 500); // 애니메이션 후 삭제
        });
    }

    function addNavigationFunctionality(item, fileName) {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: 실제 파일 ID를 사용하여 URL 생성 및 이동
            console.log(`Navigating with file: ${fileName}`);
            window.location.href = `read.html?file=${encodeURIComponent(fileName)}`;
        });
    }
    
    // 기존 아이템에도 네비게이션 기능 추가
    existingItems.forEach(item => {
        const fileName = item.querySelector('.file-name').textContent;
        addNavigationFunctionality(item, fileName);
    });
});