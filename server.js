// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ CORS 설정
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://e-do-education-one.vercel.app" // ✅ 프론트 배포 주소
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// JSON 바디 파싱
app.use(express.json());

// 🔹 테스트용 라우트
app.get('/api/hello', (req, res) => {
  res.json({ ok: true, message: "백엔드 연결 성공 ✅" });
});

// 🔹 추후 API 확장 (업로드, OCR, Quiz 등)
app.post('/api/quiz', (req, res) => {
  const { fileId } = req.body;
  // 간단히 테스트용 더미 데이터 반환
  res.json({
    ok: true,
    sourceFileId: fileId || "demoFile",
    questions: [
      {
        id: "Q1",
        question: "테스트 문제: 2 + 2는?",
        choices: ["1", "2", "3", "4", "5"],
        answerIndex: 3,
        explanation: "2 + 2 = 4입니다."
      }
    ]
  });
});

// 정적 파일 (필요시 public 폴더 연결)
app.use(express.static(path.join(__dirname, 'public')));

// 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
