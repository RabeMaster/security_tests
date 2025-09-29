import cookieParser from "cookie-parser";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import multer from "multer";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 인메모리 세션 저장소
const sessions = new Map();

const dbConfig = {
  host: "localhost",
  user: "security_demo",
  password: "!security_demo",
  database: "security_demo",
  charset: "utf8mb4",
  multipleStatements: true, // SQL Injection 시연을 위한 다중 쿼리 허용
};

const getConnection = async () => {
  try {
    return await mysql.createConnection(dbConfig);
  } catch (error) {
    console.error("DB 연결 실패:", error);
    throw error;
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
});

// 세션 미들웨어 (직접 구현)
app.use((req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId && sessions.has(sessionId)) {
    req.session = sessions.get(sessionId);
  } else {
    req.session = {};
  }
  // 세션 저장 헬퍼 함수
  req.saveSession = () => {
    if (!req.cookies.sessionId) {
      const newSessionId = crypto.randomUUID() + Math.random().toString();
      res.cookie("sessionId", newSessionId, { httpOnly: false });
      sessions.set(newSessionId, req.session);
    } else {
      sessions.set(req.cookies.sessionId, req.session);
    }
  };

  next();
});

// ==================== 사용자 관련 API ====================

// 회원가입
app.post("/api/users/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const connection = await getConnection();

    const query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}')`;
    console.log("회원가입 쿼리:\n", query);

    await connection.query(query);

    await connection.end();
    res.status(201).json({ message: "회원가입 성공" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    } else {
      console.error("회원가입 에러:", error);
      res.status(500).json({ message: "회원가입 실패" });
    }
  }
});

// 로그인 (SQL Injection 시연을 위한 취약점 포함)
app.post("/api/users/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const connection = await getConnection();

    const query = `
    SELECT * FROM users WHERE username = '${username}' AND password = '${password}'
    `;
    console.log("로그인 쿼리:\n", query);

    const [rows] = await connection.query(query);

    await connection.end();

    if (rows.length > 0) {
      req.session.user = {
        id: rows[0].id,
        username: rows[0].username,
      };
      req.saveSession();

      res.json({ message: "로그인 성공", user: req.session.user });
    } else {
      res.status(401).json({ message: "아이디 또는 비밀번호가 잘못되었습니다." });
    }
  } catch (error) {
    console.error("로그인 에러:", error);
    res.status(500).json({ message: "로그인 실패" });
  }
});

// 로그아웃
app.post("/api/users/logout", (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie("sessionId");
  res.json({ message: "로그아웃 성공" });
});

// 현재 사용자 정보 확인
app.get("/api/users/me", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: "로그인이 필요합니다." });
  }
});

// ==================== 게시글 관련 API ====================

// 게시글 목록 조회 (XSS 취약점 시연을 위한 취약점 포함)
app.get("/api/posts", async (req, res) => {
  try {
    const connection = await getConnection();

    const query = `
    SELECT p.id, p.title, p.created_at, u.username 
    FROM posts p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.created_at DESC
    `;
    console.log("게시글 목록 조회 쿼리:\n", query);

    const [rows] = await connection.query(query);

    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("게시글 목록 조회 에러:", error);
    res.status(500).json({ message: "게시글 조회 실패" });
  }
});

// 게시글 상세 조회 (XSS 취약점 시연을 위한 취약점 포함)
app.get("/api/posts/:id", async (req, res) => {
  const postId = req.params.id;

  try {
    const connection = await getConnection();

    const query = `
    SELECT p.*, u.username 
    FROM posts p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.id = ${postId}
    `;
    console.log("게시글 상세 조회 쿼리:\n", query);

    const [rows] = await connection.query(query);

    await connection.end();

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("게시글 상세 조회 에러:", error);
    res.status(500).json({ message: "게시글 조회 실패" });
  }
});

// 게시글 작성 (XSS 취약점 시연을 위한 취약점 포함)
app.post("/api/posts", upload.single("image"), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const { title, content } = req.body;
  const userId = req.session.user.id;
  const imagePath = req.file ? `uploads/${req.file.filename}` : null;
  try {
    const connection = await getConnection();

    const query = `
    INSERT INTO posts (user_id, title, content, image_path) 
    VALUES (${userId}, '${title}', '${content}', ${imagePath ? `'${imagePath}'` : "NULL"})
    `;
    console.log("게시글 작성 쿼리:\n", query);

    const [result] = await connection.query(query);

    await connection.end();
    res.status(201).json({ message: "게시글 등록 성공", postId: result.insertId });
  } catch (error) {
    console.error("게시글 작성 에러:", error);
    res.status(500).json({ message: "게시글 등록 실패" });
  }
});

// ==================== 댓글 관련 API ====================

// 댓글 목록 조회 (XSS 취약점 시연을 위한 취약점 포함)
app.get("/api/posts/:id/comments", async (req, res) => {
  const postId = req.params.id;

  try {
    const connection = await getConnection();

    const query = `
    SELECT c.content, c.created_at, u.username 
    FROM comments c 
    JOIN users u ON c.user_id = u.id 
    WHERE c.post_id = ${postId} 
    ORDER BY c.created_at ASC
    `;
    console.log("댓글 목록 조회 쿼리:\n", query);

    const [rows] = await connection.query(query);

    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("댓글 조회 에러:", error);
    res.status(500).json({ message: "댓글 조회 실패" });
  }
});

// 댓글 작성 (XSS 취약점 시연을 위한 취약점 포함)
app.post("/api/posts/:id/comments", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const postId = req.params.id;
  const { content } = req.body;
  const userId = req.session.user.id;

  try {
    const connection = await getConnection();

    const query = `
    INSERT INTO comments (post_id, user_id, content) 
    VALUES (${postId}, ${userId}, '${content}')
    `;
    console.log("댓글 작성 쿼리:\n", query);

    await connection.query(query);

    await connection.end();
    res.status(201).json({ message: "댓글 등록 성공" });
  } catch (error) {
    console.error("댓글 작성 에러:", error);
    res.status(500).json({ message: "댓글 등록 실패" });
  }
});

// ==================== 정적 파일 라우팅 ====================

// 정적 파일 제공 (Path Traversal 취약점)
app.get("/:filename", (req, res, next) => {
  const filePath = req.params.filename;
  const fullPath = path.join(__dirname, "public", filePath);

  console.log("정적 파일 요청 | 파일명: ", filePath);
  console.log("정적 파일 요청 | Join 결과 : ", fullPath);

  res.sendFile(fullPath, { dotfiles: "allow" }, (err) => {
    if (err) {
      res.status(404).json({ message: "파일을 찾을 수 없습니다." });
    }
  });
});

// 업로드된 파일 서빙 (Path Traversal 취약점)
app.use("/uploads/:filename", (req, res, next) => {
  const filePath = req.params.filename;
  const fullPath = path.join(__dirname, "uploads", filePath);

  console.log("업로드 파일 요청 | 파일명: ", filePath);
  console.log("업로드 파일 요청 | Join 결과 : ", fullPath);

  res.sendFile(fullPath, { dotfiles: "allow" }, (err) => {
    if (err) {
      res.status(404).json({ message: "파일을 찾을 수 없습니다." });
    }
  });
});

// 루트 라우트 (index.html 반환)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 처리
app.use((req, res) => {
  res.status(404).json({ message: "페이지를 찾을 수 없습니다." });
});

// 에러 처리
app.use((err, req, res, next) => {
  console.error("서버 에러:", err);
  res.status(500).json({ message: "서버 내부 오류가 발생했습니다." });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
