const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

// [1] 파일 업로드 설정
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
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

// ★ [신규] 90일 지난 반납 기록 자동 삭제 함수
async function deleteOldLogs() {
    try {
        console.log('🧹 90일 지난 기록 청소 중...');
        // returned_at이 90일 전보다 오래된 데이터 삭제
        await pool.execute('DELETE FROM rental_logs WHERE returned_at < NOW() - INTERVAL 90 DAY');
        console.log('✨ 청소 완료!');
    } catch (error) {
        console.error('청소 실패:', error);
    }
}
// 서버 켜질 때 1번 실행 + 하루(24시간)마다 실행
deleteOldLogs();
setInterval(deleteOldLogs, 24 * 60 * 60 * 1000);


// [3] 기본 라우트 & 기존 API들
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html'))); // 관리자 페이지

// 회원가입/로그인
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        await pool.execute('INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)', [username, password, studentId, name]);
        res.json({ message: '가입 신청 완료' });
    } catch (error) { res.status(500).json({ error: '오류 발생' }); }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            if (rows[0].is_approved === 0) return res.status(403).json({ error: '승인 대기 중' });
            res.json({ message: '성공', studentId: rows[0].student_id, name: rows[0].name, username: rows[0].username });
        } else res.status(400).json({ error: '정보 불일치' });
    } catch (error) { res.status(500).json({ error: '오류' }); }
});

// [4] 관리자 기능
app.get('/settings', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM site_settings WHERE id = 1'); res.json(rows[0]); } 
    catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});

// ★ 수정됨: 설정 변경 (디버깅 로그 추가)
app.post('/admin/settings', async (req, res) => {
    const { businessName, address, contact, sitemapText } = req.body;
    console.log('설정 변경 요청:', req.body); // 로그 확인용
    try {
        await pool.execute(
            'UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=? WHERE id=1',
            [businessName, address, contact, sitemapText]
        );
        res.json({ message: '저장되었습니다.' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: '저장 실패' }); 
    }
});

app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    if(!req.file) return res.status(400).json({error:'파일없음'});
    const path = '/uploads/' + req.file.filename;
    await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', [path]);
    res.json({message:'배너 적용됨'});
});
app.delete('/admin/banner', async (req, res) => {
    await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1');
    res.json({message:'삭제됨'});
});

// 승인, 공지, 일정 관리
app.get('/admin/pending-users', async (req, res) => { const [r] = await pool.execute('SELECT * FROM users WHERE is_approved=0'); res.json(r); });
app.post('/admin/approve', async (req, res) => { await pool.execute('UPDATE users SET is_approved=1 WHERE username=?', [req.body.username]); res.json({msg:'ok'}); });
app.post('/admin/notice', async (req, res) => { await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [req.body.title, req.body.content]); res.json({msg:'ok'}); });
app.delete('/admin/notice/:id', async (req, res) => { await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]); res.json({msg:'ok'}); });
app.post('/admin/schedule', async (req, res) => { await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [req.body.title, req.body.eventDate]); res.json({msg:'ok'}); });
app.delete('/admin/schedule/:id', async (req, res) => { await pool.execute('DELETE FROM schedules WHERE id=?', [req.params.id]); res.json({msg:'ok'}); });
app.post('/admin/rental-item', async (req, res) => { await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [req.body.itemName]); res.json({msg:'ok'}); });
app.delete('/admin/rental-item/:id', async (req, res) => { await pool.execute('DELETE FROM rentals WHERE id=?', [req.params.id]); res.json({msg:'ok'}); });

// ★ [신규] 반납 기록(Logs) 조회 (최신순)
app.get('/admin/rental-logs', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM rental_logs ORDER BY returned_at DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: '로그 로딩 실패' }); }
});

// [5] 조회 API
app.get('/notices', async (req, res) => { const [r] = await pool.execute('SELECT * FROM notices ORDER BY created_at DESC'); res.json(r); });
app.get('/schedules', async (req, res) => { const [r] = await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC'); res.json(r); });
app.get('/rentals', async (req, res) => { const [r] = await pool.execute('SELECT * FROM rentals'); res.json(r); });


// [6] 대여/반납 시스템 (수정됨)

// 대여 (rented_at 추가)
app.post('/rentals/rent', async (req, res) => {
    const { id, renterName, renterStudentId, renterPhone } = req.body;
    try {
        const [check] = await pool.execute('SELECT is_rented FROM rentals WHERE id=?', [id]);
        if (check[0].is_rented) return res.status(400).json({ error: '이미 대여중' });

        // rented_at에 현재 시간(NOW()) 저장
        await pool.execute(
            `UPDATE rentals SET is_rented=1, renter_name=?, renter_student_id=?, renter_phone=?, rented_at=NOW(), return_image=NULL WHERE id=?`,
            [renterName, renterStudentId, renterPhone, id]
        );
        res.json({ message: '대여 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 반납 (Logs로 이동 후 초기화)
app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    const { id, confirmStudentId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: '사진 필요' });

    try {
        // 1. 현재 대여 정보 가져오기
        const [rows] = await pool.execute('SELECT * FROM rentals WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(400).json({ error: '물품 없음' });
        
        const item = rows[0];
        if (item.renter_student_id !== confirmStudentId) return res.status(403).json({ error: '학번 불일치' });

        const imagePath = '/uploads/' + file.filename;

        // 2. ★ 기록 보관소(rental_logs)에 저장 (이사하기)
        await pool.execute(
            `INSERT INTO rental_logs (item_name, renter_name, renter_student_id, renter_phone, rented_at, return_image) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item.item_name, item.renter_name, item.renter_student_id, item.renter_phone, item.rented_at, imagePath]
        );

        // 3. 원본 테이블 초기화
        await pool.execute(
            `UPDATE rentals SET is_rented=0, renter_name=NULL, renter_student_id=NULL, renter_phone=NULL, rented_at=NULL, return_image=NULL WHERE id=?`,
            [id]
        );

        res.json({ message: '반납 완료' });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });