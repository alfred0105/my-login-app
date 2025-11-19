const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer'); // 사진 업로드용
const fs = require('fs');         // 파일 시스템 관리용
const app = express();

const PORT = process.env.PORT || 3000;

// =========================================
// [1] 파일 업로드 설정 (Multer)
// =========================================

// 1-1. 업로드 폴더가 없으면 자동으로 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 1-2. 저장 설정 (파일명 중복 방지)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // 파일명: 현재시간-원래이름 (예: 17320000-photo.jpg)
        // 한글 파일명 깨짐 방지를 위해 Buffer 처리 (선택사항, 기본적으로 날짜붙여서 해결)
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 1-3. 정적 파일 제공 설정
app.use(express.static(__dirname));           // html, css, js
app.use('/uploads', express.static('uploads')); // 업로드된 사진 접근 허용
app.use(express.json());                      // JSON 데이터 해석


// =========================================
// [2] 데이터베이스 연결 (TiDB)
// =========================================
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
// [3] 기본 라우트
// =========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// =========================================
// [4] 회원가입 & 로그인 (승인 시스템)
// =========================================

// 4-1. 회원가입
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
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

// 4-2. 로그인
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        const [rows] = await pool.execute(sql, [username, password]);

        if (rows.length > 0) {
            const user = rows[0];
            if (user.is_approved === 0) {
                return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
            }
            res.json({ 
                message: '로그인 성공',
                studentId: user.student_id,
                name: user.name,
                username: user.username
            });
        } else {
            res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: '서버 오류 발생' });
    }
});


// =========================================
// [5] 관리자 기능 (승인, 공지, 일정)
// =========================================

app.get('/admin/pending-users', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, student_id, name FROM users WHERE is_approved = 0');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: '실패' }); }
});

app.post('/admin/approve', async (req, res) => {
    const { username } = req.body;
    try {
        await pool.execute('UPDATE users SET is_approved = 1 WHERE username = ?', [username]);
        res.json({ message: '승인 완료' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});

// 공지사항
app.post('/admin/notice', async (req, res) => {
    const { title, content } = req.body;
    try {
        await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [title, content]);
        res.json({ message: '등록 완료' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});

app.delete('/admin/notice/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ message: '삭제 완료' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});

// 일정
app.post('/admin/schedule', async (req, res) => {
    const { title, eventDate } = req.body;
    try {
        await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [title, eventDate]);
        res.json({ message: '등록 완료' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});

app.delete('/admin/schedule/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);
        res.json({ message: '삭제 완료' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});


// =========================================
// [6] 조회 기능 (공지, 일정, 물품목록)
// =========================================

app.get('/notices', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM notices ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});

app.get('/schedules', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});

app.get('/rentals', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM rentals');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});


// =========================================
// [7] 물품 대여 시스템 (핵심 기능)
// =========================================

// 7-1. 대여하기 (전화번호 포함)
app.post('/rentals/rent', async (req, res) => {
    const { id, renterName, renterStudentId, renterPhone } = req.body;
    try {
        // 중복 대여 방지
        const [rows] = await pool.execute('SELECT is_rented FROM rentals WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].is_rented === 1) {
            return res.status(400).json({ error: '이미 대여중인 물품입니다.' });
        }

        // 대여 정보 업데이트 (반납 이미지는 NULL로 초기화)
        const sql = `UPDATE rentals SET 
                     is_rented = 1, 
                     renter_name = ?, 
                     renter_student_id = ?, 
                     renter_phone = ?, 
                     return_image = NULL 
                     WHERE id = ?`;
        
        await pool.execute(sql, [renterName, renterStudentId, renterPhone, id]);
        res.json({ message: '대여 완료되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '대여 실패' });
    }
});

// 7-2. 반납하기 (사진 업로드 + 학번 검증)
app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    const { id, confirmStudentId } = req.body;
    const file = req.file; // 업로드된 파일

    if (!file) return res.status(400).json({ error: '반납 인증 사진이 필요합니다.' });

    try {
        // 1. 해당 물품의 대여 정보 가져오기
        const [rows] = await pool.execute('SELECT renter_student_id FROM rentals WHERE id = ?', [id]);
        
        if (rows.length === 0) return res.status(400).json({ error: '물품이 존재하지 않습니다.' });
        
        const originalRenterId = rows[0].renter_student_id;

        // 2. 빌린 사람의 학번과 입력한 학번 대조
        if (originalRenterId !== confirmStudentId) {
            // (보안상 업로드된 파일은 삭제하는 것이 좋으나, 여기선 생략)
            return res.status(403).json({ error: '대여 시 입력한 학번과 일치하지 않습니다.' });
        }

        // 3. 반납 처리 (상태=0, 반납사진 경로 저장)
        // ★ 주의: is_rented = 0 으로 만들면 즉시 다시 대여 가능해집니다.
        // 대여자 정보(이름, 폰, 학번)는 NULL로 지우고, 반납 사진만 남깁니다.
        const imagePath = '/uploads/' + file.filename;
        
        const sql = `UPDATE rentals SET 
                     is_rented = 0, 
                     renter_name = NULL, 
                     renter_student_id = NULL, 
                     renter_phone = NULL, 
                     return_image = ? 
                     WHERE id = ?`;

        await pool.execute(sql, [imagePath, id]);

        res.json({ message: '반납 확인되었습니다.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '반납 처리 중 오류가 발생했습니다.' });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});