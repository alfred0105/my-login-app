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

// [3] 자동 청소
async function deleteOldLogs() {
    try { await pool.execute('DELETE FROM rental_logs WHERE returned_at < NOW() - INTERVAL 90 DAY'); } 
    catch (error) { console.error('청소 실패:', error); }
}
deleteOldLogs();
setInterval(deleteOldLogs, 24 * 60 * 60 * 1000);

// [4] 기본 라우트
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// [5] 회원가입 & 로그인 (중복 로그인 방지 로직 추가)
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        // 중복 아이디 체크는 DB의 UNIQUE 제약조건(ER_DUP_ENTRY)이 처리함
        await pool.execute('INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)', 
            [username, password, studentId, name]);
        res.json({ message: '가입 신청 완료! 승인 대기 중입니다.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        else res.status(500).json({ error: '서버 오류' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
            if (user.is_approved === 0) return res.status(403).json({ error: '승인 대기 중입니다.' });

            // ★ 중복 로그인 방지: 로그인 시마다 새로운 랜덤 토큰 생성 후 DB에 저장
            const sessionToken = Math.random().toString(36).substr(2) + Date.now();
            await pool.execute('UPDATE users SET current_token = ? WHERE id = ?', [sessionToken, user.id]);

            res.json({ 
                message: '로그인 성공', 
                studentId: user.student_id, 
                name: user.name, 
                username: user.username,
                isAdmin: user.is_admin, // 관리자 여부 전달
                token: sessionToken     // 토큰 전달
            });
        } else {
            res.status(400).json({ error: '아이디/비번 불일치' });
        }
    } catch (error) { res.status(500).json({ error: '서버 오류' }); }
});

// ★ 로그인 상태 체크 API (페이지 이동 시마다 호출하여 중복 로그인 감지)
app.post('/check-session', async (req, res) => {
    const { username, token } = req.body;
    try {
        const [rows] = await pool.execute('SELECT current_token FROM users WHERE username = ?', [username]);
        if (rows.length > 0 && rows[0].current_token === token) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false }); // 다른 기기에서 로그인됨
        }
    } catch (e) { res.json({ valid: false }); }
});


// [6] 관리자 기능 (설정, 유저관리 등)

// 6-1. 설정 관리 (색상 추가됨)
app.get('/settings', async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM site_settings WHERE id = 1'); res.json(rows[0]); } 
    catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});

app.post('/admin/settings', async (req, res) => {
    const { businessName, address, contact, sitemapText, bgColor, headerColor } = req.body;
    try {
        await pool.execute(
            'UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=?, bg_color=?, header_color=? WHERE id=1',
            [businessName, address, contact, sitemapText, bgColor, headerColor]
        );
        res.json({ message: '설정 저장됨' });
    } catch (error) { res.status(500).json({ error: '저장 실패' }); }
});

app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    if(!req.file) return res.status(400).json({error:'파일 없음'});
    try {
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', [base64]);
        res.json({ message: '배너 적용됨' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});
app.delete('/admin/banner', async (req, res) => { /* 기존 동일 */ try{ await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1'); res.json({message:'삭제됨'}); } catch(e){res.status(500).json({error:'실패'});} });

// 6-2. [신규] 계정 관리 (목록, 권한부여, 삭제)
app.get('/admin/users', async (req, res) => {
    try { 
        // 비밀번호 제외하고 조회
        const [rows] = await pool.execute('SELECT id, username, student_id, name, is_approved, is_admin FROM users'); 
        res.json(rows); 
    } catch (error) { res.status(500).json({ error: '로딩 실패' }); }
});

app.put('/admin/user/role', async (req, res) => {
    const { id, isAdmin } = req.body; // isAdmin: 1 or 0
    try {
        await pool.execute('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin, id]);
        res.json({ message: '권한 변경 완료' });
    } catch (error) { res.status(500).json({ error: '변경 실패' }); }
});

app.put('/admin/user/approve', async (req, res) => {
    const { id, isApproved } = req.body;
    try {
        await pool.execute('UPDATE users SET is_approved = ? WHERE id = ?', [isApproved, id]);
        res.json({ message: '상태 변경 완료' });
    } catch (error) { res.status(500).json({ error: '변경 실패' }); }
});

app.delete('/admin/user/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: '계정 삭제 완료' });
    } catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

// 6-3. 컨텐츠 관리 (공지, 일정, 물품 - 기존 동일)
app.post('/admin/notice', async (req, res) => { /* 기존 동일 */ try { await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [req.body.title, req.body.content]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });
app.put('/admin/notice/:id', async (req, res) => { /* 기존 동일 */ try { await pool.execute('UPDATE notices SET title=?, content=? WHERE id=?', [req.body.title, req.body.content, req.params.id]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });
app.delete('/admin/notice/:id', async (req, res) => { /* 기존 동일 */ try { await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });

app.post('/admin/schedule', async (req, res) => { /* 기존 동일 */ try { await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [req.body.title, req.body.eventDate]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });
app.put('/admin/schedule/:id', async (req, res) => { /* 기존 동일 */ try { await pool.execute('UPDATE schedules SET title=?, event_date=? WHERE id=?', [req.body.title, req.body.eventDate, req.params.id]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });
app.delete('/admin/schedule/:id', async (req, res) => { /* 기존 동일 */ try { await pool.execute('DELETE FROM schedules WHERE id=?', [req.params.id]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });

app.post('/admin/rental-item', async (req, res) => { /* 기존 동일 */ try { await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [req.body.itemName]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });
app.delete('/admin/rental-item/:id', async (req, res) => { /* 기존 동일 */ try { await pool.execute('DELETE FROM rentals WHERE id=?', [req.params.id]); res.json({msg:'ok'}); } catch(e){res.status(500).json({error:'err'});} });
app.get('/admin/rental-logs', async (req, res) => { try { const [rows] = await pool.execute('SELECT * FROM rental_logs ORDER BY returned_at DESC'); res.json(rows); } catch (error) { res.status(500).json({ error: 'err' }); } });

// [7] 조회 및 대여/반납 (기존 동일 + 색상 설정 반환)
app.get('/notices', async (req, res) => { const [r]=await pool.execute('SELECT * FROM notices ORDER BY created_at DESC'); res.json(r); });
app.get('/schedules', async (req, res) => { const [r]=await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC'); res.json(r); });
app.get('/rentals', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rentals'); res.json(r); });

app.post('/rentals/rent', async (req, res) => {
    const { id, renterName, renterStudentId, renterPhone } = req.body;
    try {
        const [check] = await pool.execute('SELECT is_rented FROM rentals WHERE id=?', [id]);
        if (check[0].is_rented) return res.status(400).json({ error: '이미 대여중' });
        await pool.execute(`UPDATE rentals SET is_rented=1, renter_name=?, renter_student_id=?, renter_phone=?, rented_at=NOW(), return_image=NULL WHERE id=?`, [renterName, renterStudentId, renterPhone, id]);
        res.json({ message: '대여 완료' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    const { id, confirmStudentId } = req.body;
    if (!req.file) return res.status(400).json({ error: '사진 필요' });
    try {
        const [rows] = await pool.execute('SELECT * FROM rentals WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(400).json({ error: '물품 없음' });
        if (rows[0].renter_student_id !== confirmStudentId) return res.status(403).json({ error: '학번 불일치' });

        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        await pool.execute(`INSERT INTO rental_logs (item_name, renter_name, renter_student_id, renter_phone, rented_at, return_image) VALUES (?, ?, ?, ?, ?, ?)`, [rows[0].item_name, rows[0].renter_name, rows[0].renter_student_id, rows[0].renter_phone, rows[0].rented_at, base64]);
        await pool.execute(`UPDATE rentals SET is_rented=0, renter_name=NULL, renter_student_id=NULL, renter_phone=NULL, rented_at=NULL, return_image=NULL WHERE id=?`, [id]);
        res.json({ message: '반납 완료' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });