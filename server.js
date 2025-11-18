const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

// Render가 지정해주는 포트를 사용하거나, 없으면 3000번 사용
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json());

// ★ 데이터베이스 연결 설정 (환경 변수 사용)
const pool = mysql.createPool({
    host: process.env.DB_HOST,       // Render 설정에서 가져올 값
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: 4000,                      // TiDB는 포트 4000번 사용
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 회원가입
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        const sql = 'INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)';
        await pool.execute(sql, [username, password, studentId, name]);
        res.json({ message: '회원가입 성공' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        } else {
            res.status(500).json({ error: '서버 오류 발생' });
        }
    }
});

// 로그인
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        const [rows] = await pool.execute(sql, [username, password]);

        if (rows.length > 0) {
            const user = rows[0];
            res.json({ 
                message: '로그인 성공',
                studentId: user.student_id,
                name: user.name
            });
        } else {
            res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 오류 발생' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});