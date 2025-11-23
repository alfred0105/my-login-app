const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

// =========================================
// [1] 기본 설정 (파일 업로드 & 미들웨어)
// =========================================

// [1-1] 업로드 폴더 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

// [1-2] Multer 저장 설정 (한글 깨짐 방지 + 날짜)
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// [1-3] 미들웨어 적용
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));
app.use(express.json());


// =========================================
// [2] 데이터베이스 연결 (TiDB)
// =========================================
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


// =========================================
// [3] 자동 유지보수 (로그 삭제)
// =========================================
async function deleteOldLogs() {
    try {
        // 90일 지난 반납 기록 삭제
        await pool.execute('DELETE FROM rental_logs WHERE returned_at < NOW() - INTERVAL 90 DAY');
        console.log('🧹 [System] 오래된 기록 정리 완료');
    } catch (error) { console.error('청소 실패:', error); }
}
deleteOldLogs(); // 시작 시 1회 실행
setInterval(deleteOldLogs, 24 * 60 * 60 * 1000); // 매일 실행


// =========================================
// [4] 페이지 라우팅
// =========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));


// =========================================
// [5] 인증 시스템 (가입/로그인)
// =========================================

// [5-1] 회원가입
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        await pool.execute('INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)', 
            [username, password, studentId, name]);
        res.json({ message: '가입 신청 완료! 승인 대기 중입니다.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        else res.status(500).json({ error: '서버 오류' });
    }
});

// [5-2] 로그인
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            if (rows[0].is_approved === 0) return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
            res.json({ message: '로그인 성공', studentId: rows[0].student_id, name: rows[0].name, username: rows[0].username });
        } else {
            res.status(400).json({ error: '정보 불일치' });
        }
    } catch (error) { res.status(500).json({ error: '서버 오류' }); }
});


// =========================================
// [6] 관리자 기능 API
// =========================================

// [6-1] 설정 관리 (조회/수정/배너)
app.get('/settings', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM site_settings WHERE id = 1'); res.json(rows[0]); } 
    catch (error) { res.status(500).json({ error: '설정 로딩 실패' }); }
});

app.post('/admin/settings', async (req, res) => {
    const { businessName, address, contact, sitemapText } = req.body;
    try {
        await pool.execute('UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=? WHERE id=1',
            [businessName, address, contact, sitemapText]);
        res.json({ message: '설정 저장됨' });
    } catch (error) { res.status(500).json({ error: '저장 실패' }); }
});

app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    if(!req.file) return res.status(400).json({error:'파일 없음'});
    const path = '/uploads/' + req.file.filename;
    try {
        await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', [path]);
        res.json({ message: '배너 적용됨' });
    } catch (error) { res.status(500).json({ error: '업로드 실패' }); }
});

app.delete('/admin/banner', async (req, res) => {
    try {
        await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1');
        res.json({ message: '배너 삭제됨' });
    } catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

// [6-2] 회원 승인
app.get('/admin/pending-users', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM users WHERE is_approved=0'); res.json(rows); } 
    catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});
app.post('/admin/approve', async (req, res) => {
    try { await pool.execute('UPDATE users SET is_approved=1 WHERE username=?', [req.body.username]); res.json({msg:'승인됨'}); } 
    catch (error) { res.status(500).json({ error: '승인 실패' }); }
});

// [6-3] 공지사항 관리
app.post('/admin/notice', async (req, res) => {
    try { await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [req.body.title, req.body.content]); res.json({msg:'등록됨'}); } 
    catch (error) { res.status(500).json({ error: '등록 실패' }); }
});
app.put('/admin/notice/:id', async (req, res) => {
    try { await pool.execute('UPDATE notices SET title=?, content=? WHERE id=?', [req.body.title, req.body.content, req.params.id]); res.json({msg:'수정됨'}); }
    catch (error) { res.status(500).json({ error: '수정 실패' }); }
});
app.delete('/admin/notice/:id', async (req, res) => {
    try { await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]); res.json({msg:'삭제됨'}); } 
    catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

// [6-4] 일정 관리
app.post('/admin/schedule', async (req, res) => {
    try { await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [req.body.title, req.body.eventDate]); res.json({msg:'등록됨'}); } 
    catch (error) { res.status(500).json({ error: '등록 실패' }); }
});
app.put('/admin/schedule/:id', async (req, res) => {
    try { await pool.execute('UPDATE schedules SET title=?, event_date=? WHERE id=?', [req.body.title, req.body.eventDate, req.params.id]); res.json({msg:'수정됨'}); }
    catch (error) { res.status(500).json({ error: '수정 실패' }); }
});
app.delete('/admin/schedule/:id', async (req, res) => {
    try { await pool.execute('DELETE FROM schedules WHERE id=?', [req.params.id]); res.json({msg:'삭제됨'}); } 
    catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

// [6-5] 물품 관리 (항목 추가/삭제)
app.post('/admin/rental-item', async (req, res) => {
    try { await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [req.body.itemName]); res.json({msg:'추가됨'}); } 
    catch (error) { res.status(500).json({ error: '추가 실패' }); }
});
app.delete('/admin/rental-item/:id', async (req, res) => {
    try { await pool.execute('DELETE FROM rentals WHERE id=?', [req.params.id]); res.json({msg:'삭제됨'}); } 
    catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

// [6-6] 반납 기록 조회
app.get('/admin/rental-logs', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM rental_logs ORDER BY returned_at DESC'); res.json(rows); } 
    catch (error) { res.status(500).json({ error: '로그 로딩 실패' }); }
});


// =========================================
// [7] 데이터 조회 (공개)
// =========================================
app.get('/notices', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM notices ORDER BY created_at DESC'); res.json(rows); } 
    catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});
app.get('/schedules', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC'); res.json(rows); } 
    catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});
app.get('/rentals', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM rentals'); res.json(rows); } 
    catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});


// =========================================
// [8] 대여 및 반납 로직
// =========================================

// [8-1] 대여 신청
app.post('/rentals/rent', async (req, res) => {
    const { id, renterName, renterStudentId, renterPhone } = req.body;
    try {
        const [check] = await pool.execute('SELECT is_rented FROM rentals WHERE id=?', [id]);
        if (check[0].is_rented) return res.status(400).json({ error: '이미 대여중입니다.' });

        // rented_at(현재시간) 기록
        await pool.execute(
            `UPDATE rentals SET is_rented=1, renter_name=?, renter_student_id=?, renter_phone=?, rented_at=NOW(), return_image=NULL WHERE id=?`,
            [renterName, renterStudentId, renterPhone, id]
        );
        res.json({ message: '대여 완료되었습니다.' });
    } catch (error) { res.status(500).json({ error: '대여 실패: ' + error.message }); }
});

// [8-2] 반납 신청
app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    const { id, confirmStudentId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: '반납 사진이 필요합니다.' });

    try {
        const [rows] = await pool.execute('SELECT * FROM rentals WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(400).json({ error: '물품이 없습니다.' });
        
        const item = rows[0];
        if (item.renter_student_id !== confirmStudentId) return res.status(403).json({ error: '학번 불일치' });

        const imagePath = '/uploads/' + file.filename;

        // 1. 로그 테이블로 이동
        await pool.execute(
            `INSERT INTO rental_logs (item_name, renter_name, renter_student_id, renter_phone, rented_at, return_image) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item.item_name, item.renter_name, item.renter_student_id, item.renter_phone, item.rented_at, imagePath]
        );

        // 2. 원본 초기화
        await pool.execute(
            `UPDATE rentals SET is_rented=0, renter_name=NULL, renter_student_id=NULL, renter_phone=NULL, rented_at=NULL, return_image=NULL WHERE id=?`,
            [id]
        );
        res.json({ message: '반납 확인되었습니다.' });
    } catch (error) { res.status(500).json({ error: '반납 실패: ' + error.message }); }
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });