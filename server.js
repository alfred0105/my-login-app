const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

// [1] 설정: 파일 업로드 (메모리 저장) & 미들웨어
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// [3] 자동 청소 (로그 삭제)
async function deleteOldLogs() {
    try { await pool.execute('DELETE FROM rental_logs WHERE returned_at < NOW() - INTERVAL 90 DAY'); } 
    catch (e) { console.error(e); }
}
setInterval(deleteOldLogs, 24 * 60 * 60 * 1000);

// [4] 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// [5] 인증 (가입, 로그인, 세션체크)
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        await pool.execute('INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)', [username, password, studentId, name]);
        res.json({ message: '가입 신청 완료' });
    } catch (e) { res.status(500).json({ error: '이미 존재하는 아이디입니다.' }); }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
            if (!user.is_approved) return res.status(403).json({ error: '승인 대기 중' });
            
            // 중복 로그인 방지용 토큰 생성
            const token = Math.random().toString(36).substr(2) + Date.now();
            await pool.execute('UPDATE users SET current_token=? WHERE id=?', [token, user.id]);

            res.json({ message: '성공', studentId: user.student_id, name: user.name, username: user.username, isAdmin: user.is_admin, token });
        } else res.status(400).json({ error: '정보 불일치' });
    } catch (e) { res.status(500).json({ error: '오류' }); }
});

app.post('/check-session', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT current_token FROM users WHERE username=?', [req.body.username]);
        if (rows.length > 0 && rows[0].current_token === req.body.token) res.json({ valid: true });
        else res.json({ valid: false });
    } catch (e) { res.json({ valid: false }); }
});

// [6] 관리자 기능 (설정, 유저, 컨텐츠)
app.get('/settings', async (req, res) => {
    try { const [r] = await pool.execute('SELECT * FROM site_settings WHERE id=1'); res.json(r[0]); } catch (e) { res.status(500).json({}); }
});
app.post('/admin/settings', async (req, res) => {
    try {
        await pool.execute('UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=?, bg_color=?, header_color=? WHERE id=1', 
            [req.body.businessName, req.body.address, req.body.contact, req.body.sitemapText, req.body.bgColor, req.body.headerColor]);
        res.json({ message: '저장됨' });
    } catch (e) { res.status(500).json({ error: '실패' }); }
});
app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    if(!req.file) return res.status(400).json({error:'파일 없음'});
    const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', [b64]);
    res.json({ message: '적용됨' });
});
app.delete('/admin/banner', async (req, res) => {
    await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1');
    res.json({ message: '삭제됨' });
});

// 유저 관리
app.get('/admin/users', async (req, res) => { try{const [r]=await pool.execute('SELECT id,username,student_id,name,is_approved,is_admin FROM users');res.json(r);}catch(e){res.status(500).json({});} });
app.put('/admin/user/role', async (req, res) => { try{await pool.execute('UPDATE users SET is_admin=? WHERE id=?',[req.body.isAdmin, req.body.id]);res.json({msg:'ok'});}catch(e){res.status(500).json({});} });
app.put('/admin/user/approve', async (req, res) => { try{await pool.execute('UPDATE users SET is_approved=? WHERE id=?',[req.body.isApproved, req.body.id]);res.json({msg:'ok'});}catch(e){res.status(500).json({});} });
app.delete('/admin/user/:id', async (req, res) => { try{await pool.execute('DELETE FROM users WHERE id=?',[req.params.id]);res.json({msg:'ok'});}catch(e){res.status(500).json({});} });

// 컨텐츠 & 물품 관리 (CRUD)
app.get('/admin/pending-users', async (req, res) => { const [r]=await pool.execute('SELECT * FROM users WHERE is_approved=0'); res.json(r); });
app.post('/admin/notice', async (req, res) => { await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [req.body.title, req.body.content]); res.json({msg:'ok'}); });
app.put('/admin/notice/:id', async (req, res) => { await pool.execute('UPDATE notices SET title=?, content=? WHERE id=?', [req.body.title, req.body.content, req.params.id]); res.json({msg:'ok'}); });
app.delete('/admin/notice/:id', async (req, res) => { await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]); res.json({msg:'ok'}); });
app.post('/admin/schedule', async (req, res) => { await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [req.body.title, req.body.eventDate]); res.json({msg:'ok'}); });
app.put('/admin/schedule/:id', async (req, res) => { await pool.execute('UPDATE schedules SET title=?, event_date=? WHERE id=?', [req.body.title, req.body.eventDate, req.params.id]); res.json({msg:'ok'}); });
app.delete('/admin/schedule/:id', async (req, res) => { await pool.execute('DELETE FROM schedules WHERE id=?', [req.params.id]); res.json({msg:'ok'}); });
app.post('/admin/rental-item', async (req, res) => { await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [req.body.itemName]); res.json({msg:'ok'}); });
app.delete('/admin/rental-item/:id', async (req, res) => { await pool.execute('DELETE FROM rentals WHERE id=?', [req.params.id]); res.json({msg:'ok'}); });
app.get('/admin/rental-logs', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rental_logs ORDER BY returned_at DESC'); res.json(r); });

// [7] 조회 및 대여/반납
app.get('/notices', async (req, res) => { const [r]=await pool.execute('SELECT * FROM notices ORDER BY created_at DESC'); res.json(r); });
app.get('/schedules', async (req, res) => { const [r]=await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC'); res.json(r); });
app.get('/rentals', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rentals'); res.json(r); });

app.post('/rentals/rent', async (req, res) => {
    try {
        const [c] = await pool.execute('SELECT is_rented FROM rentals WHERE id=?', [req.body.id]);
        if (c[0].is_rented) return res.status(400).json({ error: '이미 대여중' });
        await pool.execute('UPDATE rentals SET is_rented=1, renter_name=?, renter_student_id=?, renter_phone=?, rented_at=NOW(), return_image=NULL WHERE id=?', 
            [req.body.renterName, req.body.renterStudentId, req.body.renterPhone, req.body.id]);
        res.json({ message: '대여 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: '사진 필요' });
    try {
        const [r] = await pool.execute('SELECT * FROM rentals WHERE id=?', [req.body.id]);
        if (r.length === 0) return res.status(400).json({ error: '물품 없음' });
        if (r[0].renter_student_id !== req.body.confirmStudentId) return res.status(403).json({ error: '학번 불일치' });

        const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        await pool.execute('INSERT INTO rental_logs (item_name, renter_name, renter_student_id, renter_phone, rented_at, return_image) VALUES (?,?,?,?,?,?)', 
            [r[0].item_name, r[0].renter_name, r[0].renter_student_id, r[0].renter_phone, r[0].rented_at, b64]);
        await pool.execute('UPDATE rentals SET is_rented=0, renter_name=NULL, renter_student_id=NULL, renter_phone=NULL, rented_at=NULL, return_image=NULL WHERE id=?', [req.body.id]);
        res.json({ message: '반납 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });