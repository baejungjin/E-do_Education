document.addEventListener("DOMContentLoaded", () => {
    // 기존 파일 목록 로드 로직이 있다면 여기에 유지합니다.
    // 예: loadFiles();

    // 애니메이션 로직 추가
    const animatedElements = document.querySelectorAll(".anim-on-load");

    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add("visible");
        }, 100 + index * 100); // 0.1초 간격으로 순차적 표시
    });
});

// 예시: 기존 파일 로드 함수
// function loadFiles() { ... }