const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer'); // 사진 업로드용
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// =========================================
// [1] 파일 업로드 설정 (변경됨: 메모리 저장 방식)
// =========================================

// ★ 핵심 변경: 파일을 하드디스크가 아니라 RAM(메모리)에 잠시 둡니다.
// (서버가 재부팅되어도 파일이 날아갈 걱정이 없습니다. 바로 DB로 넣기 때문입니다.)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 정적 파일 제공
app.use(express.static(__dirname));
// 이미지가 글자로 변환되면 용량이 커지므로 제한을 50MB로 늘립니다.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


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

// [3] 소켓 연결
io.on('connection', (socket) => { console.log('⚡ 접속됨'); });

// [4] 자동 청소
async function deleteOldLogs() {
    try { await pool.execute('DELETE FROM rental_logs WHERE returned_at < NOW() - INTERVAL 90 DAY'); } 
    catch (e) { console.error(e); }
}
setInterval(deleteOldLogs, 24 * 60 * 60 * 1000);

// [5] 라우트
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));


// =========================================
// [6] 인증 API
// =========================================
app.post('/register', async (req, res) => {
    const { username, password, studentId, name } = req.body;
    try {
        await pool.execute('INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)', [username, password, studentId, name]);
        io.emit('update_users');
        res.json({ message: '가입 신청 완료' });
    } catch (e) { res.status(500).json({ error: '이미 존재하는 아이디' }); }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
            if (!user.is_approved) return res.status(403).json({ error: '승인 대기 중' });
            
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


// =========================================
// [7] 관리자 기능
// =========================================
app.get('/settings', async (req, res) => {
    try { const [r] = await pool.execute('SELECT * FROM site_settings WHERE id=1'); res.json(r[0]); } catch (e) { res.status(500).json({}); }
});

app.post('/admin/settings', async (req, res) => {
    try {
        await pool.execute('UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=?, bg_color=?, header_color=? WHERE id=1', 
            [req.body.businessName, req.body.address, req.body.contact, req.body.sitemapText, req.body.bgColor, req.body.headerColor]);
        io.emit('update_settings');
        res.json({ message: '저장됨' });
    } catch (e) { res.status(500).json({ error: '실패' }); }
});

// ★ 수정됨: 배너 이미지 DB 직접 저장
app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    if(!req.file) return res.status(400).json({error:'파일 없음'});
    try {
        // 이미지를 글자(Base64)로 변환
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        // DB에 저장 (파일 경로가 아니라 이미지 데이터 자체를 저장)
        await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', [base64]);
        
        io.emit('update_settings');
        res.json({ message: '적용됨' });
    } catch (e) { res.status(500).json({ error: '업로드 실패' }); }
});

app.delete('/admin/banner', async (req, res) => {
    await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1');
    io.emit('update_settings');
    res.json({ message: '삭제됨' });
});

// 유저 관리
app.get('/admin/users', async (req, res) => { try{const [r]=await pool.execute('SELECT id,username,student_id,name,is_approved,is_admin FROM users');res.json(r);}catch(e){res.status(500).json({});} });
app.put('/admin/user/role', async (req, res) => { try{await pool.execute('UPDATE users SET is_admin=? WHERE id=?',[req.body.isAdmin, req.body.id]);res.json({msg:'ok'});}catch(e){res.status(500).json({});} });
app.put('/admin/user/approve', async (req, res) => { try{await pool.execute('UPDATE users SET is_approved=? WHERE id=?',[req.body.isApproved, req.body.id]); io.emit('update_users'); res.json({msg:'ok'});}catch(e){res.status(500).json({});} });
app.delete('/admin/user/:id', async (req, res) => { try{await pool.execute('DELETE FROM users WHERE id=?',[req.params.id]);res.json({msg:'ok'});}catch(e){res.status(500).json({});} });

// 컨텐츠 관리
app.get('/admin/pending-users', async (req, res) => { const [r]=await pool.execute('SELECT * FROM users WHERE is_approved=0'); res.json(r); });
app.post('/admin/notice', async (req, res) => { await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [req.body.title, req.body.content]); io.emit('update_notices'); res.json({msg:'ok'}); });
app.put('/admin/notice/:id', async (req, res) => { await pool.execute('UPDATE notices SET title=?, content=? WHERE id=?', [req.body.title, req.body.content, req.params.id]); io.emit('update_notices'); res.json({msg:'ok'}); });
app.delete('/admin/notice/:id', async (req, res) => { await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]); io.emit('update_notices'); res.json({msg:'ok'}); });

app.post('/admin/schedule', async (req, res) => { await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [req.body.title, req.body.eventDate]); io.emit('update_schedules'); res.json({msg:'ok'}); });
app.put('/admin/schedule/:id', async (req, res) => { await pool.execute('UPDATE schedules SET title=?, event_date=? WHERE id=?', [req.body.title, req.body.eventDate, req.params.id]); io.emit('update_schedules'); res.json({msg:'ok'}); });
app.delete('/admin/schedule/:id', async (req, res) => { await pool.execute('DELETE FROM schedules WHERE id=?', [req.params.id]); io.emit('update_schedules'); res.json({msg:'ok'}); });

app.post('/admin/rental-item', async (req, res) => { await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [req.body.itemName]); io.emit('update_rentals'); res.json({msg:'ok'}); });
app.delete('/admin/rental-item/:id', async (req, res) => { await pool.execute('DELETE FROM rentals WHERE id=?', [req.params.id]); io.emit('update_rentals'); res.json({msg:'ok'}); });
app.get('/admin/rental-logs', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rental_logs ORDER BY returned_at DESC'); res.json(r); });


// =========================================
// [8] 조회 API
// =========================================
app.get('/notices', async (req, res) => { const [r]=await pool.execute('SELECT * FROM notices ORDER BY created_at DESC'); res.json(r); });
app.get('/schedules', async (req, res) => { const [r]=await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC'); res.json(r); });
app.get('/rentals', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rentals'); res.json(r); });


// =========================================
// [9] 대여 & 반납 (사진 DB 저장)
// =========================================
app.post('/rentals/rent', async (req, res) => {
    try {
        const [c] = await pool.execute('SELECT is_rented FROM rentals WHERE id=?', [req.body.id]);
        if (c[0].is_rented) return res.status(400).json({ error: '이미 대여중' });
        await pool.execute('UPDATE rentals SET is_rented=1, renter_name=?, renter_student_id=?, renter_phone=?, rented_at=NOW(), return_image=NULL WHERE id=?', 
            [req.body.renterName, req.body.renterStudentId, req.body.renterPhone, req.body.id]);
        io.emit('update_rentals');
        res.json({ message: '대여 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ★ 수정됨: 반납 사진 DB 저장
app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: '사진 필요' });
    try {
        const [r] = await pool.execute('SELECT * FROM rentals WHERE id=?', [req.body.id]);
        if (r.length === 0) return res.status(400).json({ error: '물품 없음' });
        if (r[0].renter_student_id !== req.body.confirmStudentId) return res.status(403).json({ error: '학번 불일치' });

        // 이미지를 긴 글자(Base64)로 변환
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        await pool.execute('INSERT INTO rental_logs (item_name, renter_name, renter_student_id, renter_phone, rented_at, return_image) VALUES (?,?,?,?,?,?)', 
            [r[0].item_name, r[0].renter_name, r[0].renter_student_id, r[0].renter_phone, r[0].rented_at, base64]);
        
        await pool.execute('UPDATE rentals SET is_rented=0, renter_name=NULL, renter_student_id=NULL, renter_phone=NULL, rented_at=NULL, return_image=NULL WHERE id=?', [req.body.id]);
        
        io.emit('update_rentals');
        io.emit('update_logs');
        res.json({ message: '반납 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });