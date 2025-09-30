document.addEventListener('DOMContentLoaded', () => {
    // 1. 타이핑 효과
    const subMessage = document.querySelector('.sub-message');
    const text = subMessage.textContent;
    subMessage.textContent = '';
    let i = 0;

    function typing() {
        if (i < text.length) {
            subMessage.textContent += text.charAt(i);
            i++;
            setTimeout(typing, 70); // 타이핑 속도
        }
    }
    setTimeout(typing, 500); // 페이지 로드 후 0.5초 뒤 시작

    // 2. 버튼 파동(ripple) 효과
    const ctaButton = document.querySelector('.cta-button');
    ctaButton.addEventListener('click', function (e) {
        const x = e.clientX - e.target.offsetLeft;
        const y = e.clientY - e.target.offsetTop;

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 1000); // 애니메이션 시간과 동일하게
    });
});