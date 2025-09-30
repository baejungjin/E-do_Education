document.addEventListener("DOMContentLoaded", () => {
    // 애니메이션 로직 추가
    const animatedElements = document.querySelectorAll(".anim-on-load");

    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add("visible");
        }, 100 + index * 100); // 0.1초 간격으로 순차적 표시
    });
});