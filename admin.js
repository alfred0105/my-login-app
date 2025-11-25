if (localStorage.getItem('isAdmin') !== '1') { alert('관리자만 접근 가능'); window.location.href = '/'; }

const settingsForm = document.getElementById('settingsForm');
const userList = document.getElementById('userList');
const currentRentals = document.getElementById('currentRentals');
const adminRentalList = document.getElementById('adminRentalList');
const logList = document.getElementById('logList');
const noticeListArea = document.getElementById('adminNoticeList');
const scheduleListArea = document.getElementById('adminScheduleList');

// 1. 설정
async function loadSettings() {
    try {
        const res = await fetch('/settings'); const d = await res.json();
        document.getElementById('editBizName').value = d.business_name||'';
        document.getElementById('editAddress').value = d.address||'';
        document.getElementById('editContact').value = d.contact||'';
        document.getElementById('editSitemap').value = d.sitemap_text||'';
        document.getElementById('editBgColor').value = d.bg_color||'#f4f7f6';
        document.getElementById('editHeaderColor').value = d.header_color||'#ffffff';
    } catch (e) {}
}
settingsForm.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
        businessName:document.getElementById('editBizName').value, address:document.getElementById('editAddress').value,
        contact:document.getElementById('editContact').value, sitemapText:document.getElementById('editSitemap').value,
        bgColor:document.getElementById('editBgColor').value, headerColor:document.getElementById('editHeaderColor').value
    };
    await fetch('/admin/settings', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    alert('저장됨');
};
window.uploadBanner = async () => {
    const f = document.getElementById('bannerFile').files[0]; if(!f) return alert('파일선택');
    const fd = new FormData(); fd.append('bannerFile', f);
    await fetch('/admin/banner', {method:'POST',body:fd}); alert('적용됨');
};
window.deleteBanner = async () => { if(confirm('삭제?')) { await fetch('/admin/banner', {method:'DELETE'}); alert('삭제됨'); } };

// 2. 유저 관리
async function loadUsers() {
    const res = await fetch('/admin/users'); const users = await res.json();
    userList.innerHTML = users.map(u => `<tr><td>${u.name}(${u.student_id})</td><td>${u.username}</td><td>${u.is_approved?'승인':'대기'}</td><td>${u.is_admin?'관리자':'일반'}</td><td>${!u.is_approved ? `<button onclick="approveUser(${u.id})" style="background:#28a745; margin-right:5px;">승인</button>` : ''}<button onclick="changeRole(${u.id}, ${u.is_admin?0:1})" style="background:${u.is_admin?'#6c757d':'#6610f2'}">${u.is_admin?'강등':'승격'}</button> <button onclick="deleteUser(${u.id})" style="background:#dc3545;">삭제</button></td></tr>`).join('');
}
window.approveUser = async (id) => { await fetch('/admin/user/approve', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,isApproved:1})}); };
window.changeRole = async (id, isAdmin) => { await fetch('/admin/user/role', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,isAdmin})}); loadUsers(); };
window.deleteUser = async (id) => { if(confirm('삭제?')) { await fetch(`/admin/user/${id}`, {method:'DELETE'}); loadUsers(); } };

// 3. 물품 관리
async function loadAdminRentals() {
    const res = await fetch('/rentals'); const items = await res.json();
    currentRentals.innerHTML = items.filter(i=>i.is_rented).map(i => {
        const h = Math.floor((new Date()-new Date(i.rented_at))/(1000*60*60));
        return `<div style="padding:5px; border-bottom:1px solid #ccc;">🔴 <b>${i.item_name}</b>: ${i.renter_name} (${h}시간전) <br>📞 ${i.renter_phone}</div>`;
    }).join('') || '대여중인 물품 없음';
    adminRentalList.innerHTML = items.map(i => `<li style="padding:5px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${i.item_name}</span><button onclick="deleteItem(${i.id})" style="background:#dc3545; color:white; border:none; padding:2px 5px;">삭제</button></li>`).join('');
}
document.getElementById('addRentalForm').onsubmit = async (e) => {
    e.preventDefault(); await fetch('/admin/rental-item', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemName:document.getElementById('newItemName').value})});
    document.getElementById('newItemName').value='';
};
window.deleteItem = async (id) => { if(confirm('삭제?')) await fetch(`/admin/rental-item/${id}`, {method:'DELETE'}); };

// 4. 로그 & 컨텐츠
async function loadLogs() {
    const res = await fetch('/admin/rental-logs'); const logs = await res.json();
    logList.innerHTML = logs.map(l => `<tr><td>${l.item_name}</td><td>${l.renter_name}</td><td>-</td><td>${new Date(l.returned_at).toLocaleDateString()}</td><td>${l.return_image?`<a href="${l.return_image}" target="_blank">보기</a>`:'-'}</td></tr>`).join('');
}
async function loadContent() {
    const nRes = await fetch('/notices'); const notices = await nRes.json();
    noticeListArea.innerHTML = notices.map(n => `<div style="padding:5px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${n.title}</span><div><button onclick="editNotice(${n.id},'${n.title.replace(/'/g,"\\'")}')" style="background:#007BFF; color:white; margin-right:5px;">수정</button><button onclick="delNotice(${n.id})" style="background:#dc3545; color:white;">삭제</button></div></div>`).join('');
    const sRes = await fetch('/schedules'); const scheds = await sRes.json();
    scheduleListArea.innerHTML = scheds.map(s => `<div style="padding:5px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${s.title}</span><div><button onclick="delSchedule(${s.id})" style="background:#dc3545; color:white;">삭제</button></div></div>`).join('');
}
document.getElementById('noticeForm').onsubmit = async (e) => { e.preventDefault(); await fetch('/admin/notice', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:document.getElementById('noticeTitle').value, content:document.getElementById('noticeContent').value})}); };
document.getElementById('scheduleForm').onsubmit = async (e) => { e.preventDefault(); await fetch('/admin/schedule', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:document.getElementById('schedTitle').value, eventDate:document.getElementById('schedDate').value})}); };
window.delNotice = async (id) => { if(confirm('삭제?')) await fetch(`/admin/notice/${id}`, {method:'DELETE'}); };
window.delSchedule = async (id) => { if(confirm('삭제?')) await fetch(`/admin/schedule/${id}`, {method:'DELETE'}); };

// [★ 핵심] 실시간 업데이트 수신
if(typeof io !== 'undefined') {
    const socket = io();
    socket.on('update_users', () => { /* 승인대기목록은 별도구현 안했으므로 userList갱신 */ loadUsers(); });
    socket.on('update_notices', loadContent);
    socket.on('update_schedules', loadContent);
    socket.on('update_rentals', loadAdminRentals);
    socket.on('update_logs', loadLogs);
    socket.on('update_settings', loadSettings);
}

loadSettings(); loadUsers(); loadAdminRentals(); loadLogs(); loadContent();