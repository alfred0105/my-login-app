const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');           // [1] 추가됨
const { Server } = require("socket.io");// [2] 추가됨

const app = express();
const server = http.createServer(app);  // [3] express를 http 서버로 감싸기
const io = new Server(server);          // [4] 소켓 서버 생성

const PORT = process.env.PORT || 3000;

// [파일 업로드 설정]
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

// [DB 연결]
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

// [소켓 연결 확인 로그]
io.on('connection', (socket) => {
    console.log('⚡ 사용자 접속됨');
});

// [기본 라우트]
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// [회원가입 & 로그인]
app.post('/register', async (req, res) => {
    try {
        await pool.execute('INSERT INTO users (username, password, student_id, name) VALUES (?, ?, ?, ?)', 
            [req.body.username, req.body.password, req.body.studentId, req.body.name]);
        io.emit('update_users'); // ★ 관리자에게 "새 유저 왔다" 알림
        res.json({ message: '가입 신청 완료' });
    } catch (error) { res.status(500).json({ error: '오류' }); }
});

app.post('/login', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [req.body.username, req.body.password]);
        if (rows.length > 0) {
            if (rows[0].is_approved === 0) return res.status(403).json({ error: '승인 대기 중' });
            res.json({ message: '성공', studentId: rows[0].student_id, name: rows[0].name, username: rows[0].username });
        } else res.status(400).json({ error: '정보 불일치' });
    } catch (error) { res.status(500).json({ error: '오류' }); }
});

// [관리자 기능]
app.get('/settings', async (req, res) => { /* 생략(기존동일) */ try{const [r]=await pool.execute('SELECT * FROM site_settings WHERE id=1');res.json(r[0]);}catch(e){res.status(500).json();} });

app.post('/admin/settings', async (req, res) => {
    try {
        await pool.execute('UPDATE site_settings SET business_name=?, address=?, contact=?, sitemap_text=? WHERE id=1', [req.body.businessName, req.body.address, req.body.contact, req.body.sitemapText]);
        io.emit('update_settings'); // ★ 설정 변경 알림
        res.json({ message: '저장됨' });
    } catch (error) { res.status(500).json({ error: '실패' }); }
});

app.post('/admin/banner', upload.single('bannerFile'), async (req, res) => {
    if(!req.file) return res.status(400).json({error:'파일없음'});
    await pool.execute('UPDATE site_settings SET banner_image=? WHERE id=1', ['/uploads/'+req.file.filename]);
    io.emit('update_settings'); // ★ 배너 변경 알림
    res.json({ message: '배너 적용' });
});
app.delete('/admin/banner', async (req, res) => {
    await pool.execute('UPDATE site_settings SET banner_image=NULL WHERE id=1');
    io.emit('update_settings'); // ★ 배너 삭제 알림
    res.json({ message: '배너 삭제' });
});

// 승인/공지/일정/물품 (변경 시마다 io.emit 발사!)
app.get('/admin/pending-users', async (req, res) => { const [r]=await pool.execute('SELECT * FROM users WHERE is_approved=0'); res.json(r); });
app.post('/admin/approve', async (req, res) => { await pool.execute('UPDATE users SET is_approved=1 WHERE username=?', [req.body.username]); io.emit('update_users'); res.json({msg:'ok'}); });

app.post('/admin/notice', async (req, res) => { await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [req.body.title, req.body.content]); io.emit('update_notices'); res.json({msg:'ok'}); });
app.put('/admin/notice/:id', async (req, res) => { await pool.execute('UPDATE notices SET title=?, content=? WHERE id=?', [req.body.title, req.body.content, req.params.id]); io.emit('update_notices'); res.json({msg:'ok'}); });
app.delete('/admin/notice/:id', async (req, res) => { await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]); io.emit('update_notices'); res.json({msg:'ok'}); });

app.post('/admin/schedule', async (req, res) => { await pool.execute('INSERT INTO schedules (title, event_date) VALUES (?, ?)', [req.body.title, req.body.eventDate]); io.emit('update_schedules'); res.json({msg:'ok'}); });
app.put('/admin/schedule/:id', async (req, res) => { await pool.execute('UPDATE schedules SET title=?, event_date=? WHERE id=?', [req.body.title, req.body.eventDate, req.params.id]); io.emit('update_schedules'); res.json({msg:'ok'}); });
app.delete('/admin/schedule/:id', async (req, res) => { await pool.execute('DELETE FROM schedules WHERE id=?', [req.params.id]); io.emit('update_schedules'); res.json({msg:'ok'}); });

app.post('/admin/rental-item', async (req, res) => { await pool.execute('INSERT INTO rentals (item_name) VALUES (?)', [req.body.itemName]); io.emit('update_rentals'); res.json({msg:'ok'}); });
app.delete('/admin/rental-item/:id', async (req, res) => { await pool.execute('DELETE FROM rentals WHERE id=?', [req.params.id]); io.emit('update_rentals'); res.json({msg:'ok'}); });

// [조회 API]
app.get('/notices', async (req, res) => { const [r]=await pool.execute('SELECT * FROM notices ORDER BY created_at DESC'); res.json(r); });
app.get('/schedules', async (req, res) => { const [r]=await pool.execute('SELECT * FROM schedules ORDER BY event_date ASC'); res.json(r); });
app.get('/rentals', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rentals'); res.json(r); });
app.get('/admin/rental-logs', async (req, res) => { const [r]=await pool.execute('SELECT * FROM rental_logs ORDER BY returned_at DESC'); res.json(r); });

// [대여/반납]
app.post('/rentals/rent', async (req, res) => {
    const { id, renterName, renterStudentId, renterPhone } = req.body;
    try {
        const [check] = await pool.execute('SELECT is_rented FROM rentals WHERE id=?', [id]);
        if (check[0].is_rented) return res.status(400).json({ error: '이미 대여중' });
        await pool.execute(`UPDATE rentals SET is_rented=1, renter_name=?, renter_student_id=?, renter_phone=?, rented_at=NOW(), return_image=NULL WHERE id=?`, [renterName, renterStudentId, renterPhone, id]);
        
        io.emit('update_rentals'); // ★ 실시간 업데이트
        res.json({ message: '대여 완료' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/rentals/return', upload.single('returnPhoto'), async (req, res) => {
    const { id, confirmStudentId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: '사진 필요' });
    try {
        const [rows] = await pool.execute('SELECT * FROM rentals WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(400).json({ error: '없음' });
        if (rows[0].renter_student_id !== confirmStudentId) return res.status(403).json({ error: '학번 불일치' });

        const imagePath = '/uploads/' + file.filename;
        await pool.execute(`INSERT INTO rental_logs (item_name, renter_name, renter_student_id, renter_phone, rented_at, return_image) VALUES (?, ?, ?, ?, ?, ?)`, [rows[0].item_name, rows[0].renter_name, rows[0].renter_student_id, rows[0].renter_phone, rows[0].rented_at, imagePath]);
        await pool.execute(`UPDATE rentals SET is_rented=0, renter_name=NULL, renter_student_id=NULL, renter_phone=NULL, rented_at=NULL, return_image=NULL WHERE id=?`, [id]);

        io.emit('update_rentals'); // ★ 실시간 업데이트
        io.emit('update_logs');    // ★ 로그 업데이트
        res.json({ message: '반납 완료' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ★ app.listen이 아니라 server.listen으로 변경!
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });