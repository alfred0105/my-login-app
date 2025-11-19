const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

// Render에서 포트를 지정해주면 그걸 쓰고, 없으면 3000번 사용
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname)); // 현재 폴더의 html, css, js 파일 제공
app.use(express.json()); // JSON 데이터 해석

// =========================================
// [1] 데이터베이스 연결 설정
// =========================================
// Render 환경변수(Environment Variables)에 입력한 값들을 사용합니다.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: 4000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10
});


// =========================================
// [2] 기본 라우트
// =========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// =========================================
// [3] 회원가입 & 로그인 기능
// =========================================

// 3-1. 회원가입 (기본적으로 승인 대기 상태)
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        // is_approved 컬럼은 DB에서 기본값 0(False)으로 설정되어 있다고 가정
        const sql = 'INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)';
        await pool.execute(sql, [username, password, studentId, name]);
        
        res.json({ message: '회원가입 신청 완료! 관리자 승인 후 이용 가능합니다.' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        } else {
            res.status(500).json({ error: '서버 오류 발생' });
        }
    }
});

// 3-2. 로그인 (승인 여부 체크 포함)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // 아이디 비번 확인
        const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        const [rows] = await pool.execute(sql, [username, password]);

        if (rows.length > 0) {
            const user = rows[0];

            // ★ 핵심: 관리자가 승인(is_approved = 1) 안 해줬으면 로그인 차단
            if (user.is_approved === 0) {
                return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
            }

            // 로그인 성공 시 정보 반환
            res.json({ 
                message: '로그인 성공',
                studentId: user.student_id,
                name: user.name,
                username: user.username // 프론트엔드에서 관리자(admin) 체크용
            });
        } else {
            res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 오류 발생' });
    }
});


// =========================================
// [4] 관리자 기능 (승인, 공지, 일정)
// =========================================

// 4-1. [승인] 대기 중인 유저 목록 가져오기
app.get('/admin/pending-users', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, student_id, name, created_at FROM users WHERE is_approved = 0');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '목록 불러오기 실패' });
    }
});

// 4-2. [승인] 유저 가입 승인하기
app.post('/admin/approve', async (req, res) => {
    const { username } = req.body;
    try {
        await pool.execute('UPDATE users SET is_approved = 1 WHERE username = ?', [username]);
        res.json({ message: '승인 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '승인 실패' });
    }
});

// 4-3. [공지] 공지사항 등록
app.post('/admin/notice', async (req, res) => {
    const { title, content } = req.body;
    try {
        await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [title, content]);
        res.json({ message: '공지사항 등록 완료' });
    } catch (error) {
        res.status(500).json({ error: '등록 실패' });
    }
});

// 4-4. [공지] 공지사항 삭제
app.delete('/admin/notice/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ message: '삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '삭제 실패' });
    }
});

// 4-5. [일정] 일정 등록
app.post('/admin/schedule', async (req, res) => {
    const { title, eventDate } = req.body;
    try {
        await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [title, eventDate]);
        res.json({ message: '일정 등록 완료' });
    } catch (error) {
        res.status(500).json({ error: '등록 실패' });
    }
});

// 4-6. [일정] 일정 삭제
app.delete('/admin/schedule/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);
        res.json({ message: '삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '삭제 실패' });
    }
});


// =========================================
// [5] 공개 데이터 조회 (공지, 일정 목록)
// =========================================

// 5-1. 공지사항 목록 (최신순)
app.get('/notices', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM notices ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '불러오기 실패' });
    }
});

// 5-2. 일정 목록 (날짜 가까운 순)
app.get('/schedules', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '불러오기 실패' });
    }
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});