document.addEventListener("DOMContentLoaded", () => {
  // 애니메이션 효과 적용할 요소 선택
  const animatedItems = document.querySelectorAll(".anim-on-load");

  // 페이지 로드 시 각 요소에 순차적으로 visible 클래스 추가
  animatedItems.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add("visible");
    }, index * 200); // 0.2초 간격으로 순차 등장
  });

  // 파일 업로드 input 핸들링 (옵션)
  const fileInput = document.getElementById("new-file-upload");
  const uploadBtn = document.querySelector(".upload-btn");

  if (fileInput && uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        alert(`"${file.name}" 파일이 업로드 되었습니다.`);
        // TODO: 여기서 서버 업로드 로직 추가 가능
      }
    });
  }
});
