document.addEventListener("DOMContentLoaded", () => {
    const animatedElements = document.querySelectorAll(".anim-on-load");
    
    // Intersection Observer를 사용하여 화면에 나타났을 때 애니메이션을 적용할 수도 있지만,
    // 여기서는 페이지 진입 시 바로 적용되도록 setTimeout을 사용합니다.
    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add("visible");
        }, 100 + index * 150); // 약간의 지연을 두고 순차적으로 표시
    });
});