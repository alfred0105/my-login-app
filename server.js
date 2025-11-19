const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

// [1] 파일 업로드 설정
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// [2] DB 연결
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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });


// =========================================
// [3] 기본 라우트
// =========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// =========================================
// [4] 회원가입 & 로그인 (승인 시스템)
// =========================================
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
// [5] 관리자 기능 (승인, 공지, 일정, ★물품관리★)
// =========================================

// 5-1. 유저 승인 관련
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

// 5-2. 공지사항 관리
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

// 5-3. 일정 관리
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

// 5-4. [★추가됨] 물품 추가/삭제 (관리자용)
app.post('/admin/rental-item', async (req, res) => {
    const { itemName } = req.body;
    try {
        // 새 물품 추가 (기본상태: 대여가능(0))
        await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [itemName]);
        res.json({ message: '물품이 추가되었습니다.' });
    } catch (error) { res.status(500).json({ error: '추가 실패' }); }
});

app.delete('/admin/rental-item/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 물품 삭제
        await pool.execute('DELETE FROM rentals WHERE id = ?', [id]);
        res.json({ message: '물품이 삭제되었습니다.' });
    } catch (error) { res.status(500).json({ error: '삭제 실패' }); }
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
// [7] 물품 대여/반납 시스템
// =========================================
app.post('/rentals/rent', async (req, res) => {
    const { id, renterName, renterStudentId, renterPhone } = req.body;
    try {
        const [rows] = await pool.execute('SELECT is_rented FROM rentals WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].is_rented === 1) {
            return res.status(400).json({ error: '이미 대여중인 물품입니다.' });
        }
        const sql = `UPDATE rentals SET is_rented = 1, renter_name = ?, renter_student_id = ?, renter_phone = ?, return_image = NULL WHERE id = ?`;
        await pool.execute(sql, [renterName, renterStudentId, renterPhone, id]);
        res.json({ message: '대여 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '대여 실패' });
    }
});

app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    const { id, confirmStudentId } = req.body;
    const file = req.file; 

    if (!file) return res.status(400).json({ error: '반납 인증 사진이 필요합니다.' });

    try {
        const [rows] = await pool.execute('SELECT renter_student_id FROM rentals WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(400).json({ error: '물품이 존재하지 않습니다.' });
        
        if (rows[0].renter_student_id !== confirmStudentId) {
            return res.status(403).json({ error: '대여 시 입력한 학번과 일치하지 않습니다.' });
        }

        const imagePath = '/uploads/' + file.filename;
        const sql = `UPDATE rentals SET is_rented = 0, renter_name = NULL, renter_student_id = NULL, renter_phone = NULL, return_image = ? WHERE id = ?`;
        await pool.execute(sql, [imagePath, id]);

        res.json({ message: '반납 확인되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '반납 처리 중 오류가 발생했습니다.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// [신규 2] 사이트 설정 수정 (관리자용 - 텍스트 정보)
app.post('/admin/settings', async (req, res) => {
    const { businessName, address, contact, sitemapText } = req.body;
    try {
        await pool.execute(
            'UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=? WHERE id=1',
            [businessName, address, contact, sitemapText]
        );
        res.json({ message: '설정이 저장되었습니다.' });
    } catch (error) { res.status(500).json({ error: '저장 실패' }); }
});

// [신규 3] 배너 이미지 업로드 (관리자용)
app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: '파일이 없습니다.' });
    try {
        const imagePath = '/uploads/' + file.filename;
        await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', [imagePath]);
        res.json({ message: '배너가 적용되었습니다.' });
    } catch (error) { res.status(500).json({ error: '업로드 실패' }); }
});

// [신규 4] 배너 삭제 (텍스트 로고로 복귀)
app.delete('/admin/banner', async (req, res) => {
    try {
        await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1');
        res.json({ message: '배너가 삭제되었습니다.' });
    } catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

// (기존 API들: 회원가입, 로그인, 공지, 일정, 대여, 반납 등은 위에 반드시 있어야 합니다!)
// ...

// [참고] 기존 대여 목록 API (그대로 둠)
app.get('/rentals', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM rentals'); res.json(rows); } 
    catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/rentals/rent', async (req, res) => { /* 기존 코드 유지 */ });
app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => { /* 기존 코드 유지 */ });
// ...

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });