const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json());

// DB 연결 설정 (환경변수 유지)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. 회원가입 (기본적으로 미승인 상태로 생성)
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        // is_approved는 디폴트가 0(False)이므로 따로 안 넣어도 됩니다.
        const sql = 'INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)';
        await pool.execute(sql, [username, password, studentId, name]);
        res.json({ message: '회원가입 신청 완료! 관리자 승인 후 이용 가능합니다.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        } else {
            res.status(500).json({ error: '서버 오류 발생' });
        }
    }
});

// 2. 로그인 (승인 여부 체크 추가)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        const [rows] = await pool.execute(sql, [username, password]);

        if (rows.length > 0) {
            const user = rows[0];

            // ★ 핵심: 승인되지 않은 유저는 로그인 차단
            if (user.is_approved === 0) {
                return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
            }

            res.json({ 
                message: '로그인 성공',
                studentId: user.student_id,
                name: user.name,
                username: user.username // 관리자 확인용
            });
        } else {
            res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 오류 발생' });
    }
});

// 3. [관리자용] 승인 대기 목록 가져오기
app.get('/admin/pending-users', async (req, res) => {
    try {
        // is_approved가 0인 사람만 조회
        const [rows] = await pool.execute('SELECT id, username, student_id, name, created_at FROM users WHERE is_approved = 0');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '목록 불러오기 실패' });
    }
});

// 4. [관리자용] 유저 승인해주기
app.post('/admin/approve', async (req, res) => {
    const { username } = req.body; // 승인할 유저 아이디
    try {
        await pool.execute('UPDATE users SET is_approved = 1 WHERE username = ?', [username]);
        res.json({ message: '승인 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '승인 실패' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// ... 기존 코드들 ...

// [추가 1] 공지사항 목록 가져오기 (누구나 볼 수 있음)
app.get('/notices', async (req, res) => {
    try {
        // 최신순(DESC)으로 정렬해서 가져오기
        const [rows] = await pool.execute('SELECT * FROM notices ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '공지사항 로딩 실패' });
    }
});

// [추가 2] 공지사항 작성하기 (관리자만)
app.post('/admin/notice', async (req, res) => {
    const { title, content } = req.body;
    try {
        const sql = 'INSERT INTO notices (title, content) VALUES (?, ?)';
        await pool.execute(sql, [title, content]);
        res.json({ message: '공지사항이 등록되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '등록 실패' });
    }
});

// ... app.listen ...