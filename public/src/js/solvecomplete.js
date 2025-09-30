document.addEventListener('DOMContentLoaded', () => {
    // 가장 최근 학습 fileId를 문제 페이지에서 저장한 키로 추정
    // 우선 순위: problemsolve → sessionStorage.fileId
    const fileId = sessionStorage.getItem('fileId');
    if (!fileId) return;

    const key = `quizStats:${fileId}`;
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        const stats = JSON.parse(raw);
        const correct = Number(stats.correct || 0);
        const wrong = Number(stats.wrong || 0);
        const durationMin = Math.max(1, Math.round(((Date.now() - (stats.startTs || Date.now())) / 1000) / 60));

        const $ = (id) => document.getElementById(id);
        const elCorrect = $('sc-correct');
        const elWrong = $('sc-wrong');
        const elTime = $('sc-time');

        if (elCorrect) elCorrect.textContent = String(correct);
        if (elWrong) elWrong.textContent = String(wrong);
        if (elTime) elTime.textContent = `${durationMin}분`;
    } catch (e) {
        // 통계 파싱 실패시 침묵
    }
});


