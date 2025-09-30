document.addEventListener("DOMContentLoaded", () => {
    const animatedElements = document.querySelectorAll(".anim-on-load");

    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add("visible");
        }, 100 + index * 150);
    });
});