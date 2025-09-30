document.addEventListener("DOMContentLoaded", () => {
    // 페이지의 모든 .anim-on-load 요소에 애니메이션 적용
    const animatedElements = document.querySelectorAll(".anim-on-load");

    animatedElements.forEach((el, index) => {
        // 순차적으로 나타나도록 약간의 지연을 줌
        setTimeout(() => {
            el.classList.add("visible");
        }, 100 + index * 100);
    });
});