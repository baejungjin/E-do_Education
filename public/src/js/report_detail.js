document.addEventListener('DOMContentLoaded', () => {
    const dailyLabels = ['월', '화', '수', '목', '금', '토', '일'];

    // 1. 정답률 추이 (막대그래프)
    const correctRateCtx = document.getElementById('correct-rate-chart').getContext('2d');
    new Chart(correctRateCtx, {
        type: 'bar',
        data: {
            labels: dailyLabels,
            datasets: [{
                label: '정답률',
                data: [85, 88, 90, 89, 92, 95, 91], // 7일치 데이터
                backgroundColor: 'rgba(174, 229, 216, 0.6)', // 파스텔 민트
                borderColor: 'rgba(174, 229, 216, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 70,
                    max: 100,
                    ticks: { stepSize: 5 }
                }
            }
        }
    });

    // 2. 학습 시간 추이 (선그래프)
    const studyTimeCtx = document.getElementById('study-time-chart').getContext('2d');
    new Chart(studyTimeCtx, {
        type: 'line',
        data: {
            labels: dailyLabels,
            datasets: [{
                label: '평균 학습 시간(분)',
                data: [15, 18, 16, 20, 22, 19, 25], // 7일치 데이터
                fill: false,
                borderColor: 'rgba(189, 224, 254, 1)', // 파스텔 블루
                backgroundColor: 'rgba(189, 224, 254, 0.6)',
                tension: 0.3, // 부드러운 곡선
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 10
                }
            }
        }
    });
});