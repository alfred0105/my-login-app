// admin.js

// [보안] 관리자가 아니면 메인으로 쫓아냄
const userId = localStorage.getItem('userId');
if (userId !== 'admin') {
    alert('관리자 권한이 없습니다.');
    window.location.href = '/'; // 메인 페이지로 이동
}

// 요소 선택
const settingsForm = document.getElementById('settingsForm');
const bannerFile = document.getElementById('bannerFile');
const noticeForm = document.getElementById('noticeForm');
const scheduleForm = document.getElementById('scheduleForm');
const addRentalForm = document.getElementById('addRentalForm');

const editBizName = document.getElementById('editBizName');
const editAddress = document.getElementById('editAddress');
const editContact = document.getElementById('editContact');
const editSitemap = document.getElementById('editSitemap');

const pendingList = document.getElementById('pendingList');
const adminRentalList = document.getElementById('adminRentalList');


// 1. 설정값 불러오기 (입력창 채우기)
async function loadSettings() {
    try {
        const res = await fetch('/settings');
        const data = await res.json();
        editBizName.value = data.business_name;
        editAddress.value = data.address;
        editContact.value = data.contact;
        editSitemap.value = data.sitemap_text;
    } catch (err) { console.error(err); }
}

// 2. 설정 저장
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: editBizName.value,
                address: editAddress.value,
                contact: editContact.value,
                sitemapText: editSitemap.value
            })
        });
        if (res.ok) alert('저장되었습니다.');
    } catch (err) { alert('오류'); }
});

// 3. 배너 관리
window.uploadBanner = async () => {
    const file = bannerFile.files[0];
    if (!file) return alert('파일을 선택해주세요.');
    const formData = new FormData();
    formData.append('bannerFile', file);
    try {
        const res = await fetch('/admin/banner', { method: 'POST', body: formData });
        if (res.ok) alert('배너가 적용되었습니다.');
    } catch (err) { alert('오류'); }
};

window.deleteBanner = async () => {
    if(!confirm('배너를 삭제하시겠습니까?')) return;
    try {
        await fetch('/admin/banner', { method: 'DELETE' });
        alert('삭제되었습니다.');
    } catch (err) { alert('오류'); }
};

// 4. 승인 대기 목록
async function loadPendingUsers() {
    pendingList.innerHTML = '<p>로딩 중...</p>';
    try {
        const res = await fetch('/admin/pending-users');
        const users = await res.json();
        if (users.length === 0) {
            pendingList.innerHTML = '<p>대기 중인 회원이 없습니다.</p>';
            return;
        }
        let html = '<ul style="list-style:none; padding:0;">';
        users.forEach(user => {
            html += `
                <li style="border-bottom:1px solid #eee; padding:10px; display:flex; justify-content:space-between;">
                    <span>${user.name} (${user.student_id}) - ${user.username}</span>
                    <button onclick="approveUser('${user.username}')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:3px;">승인</button>
                </li>`;
        });
        html += '</ul>';
        pendingList.innerHTML = html;
    } catch (err) { pendingList.innerHTML = '오류 발생'; }
}

window.approveUser = async (username) => {
    if (!confirm('승인하시겠습니까?')) return;
    try {
        const res = await fetch('/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        if (res.ok) { alert('승인됨'); loadPendingUsers(); }
    } catch (err) { alert('오류'); }
};

// 5. 공지 & 일정 등록
noticeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/admin/notice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('noticeTitle').value,
                content: document.getElementById('noticeContent').value
            })
        });
        if (res.ok) { alert('공지 등록 완료'); document.getElementById('noticeTitle').value=''; document.getElementById('noticeContent').value=''; }
    } catch (err) { alert('오류'); }
});

scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/admin/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('schedTitle').value,
                eventDate: document.getElementById('schedDate').value
            })
        });
        if (res.ok) { alert('일정 등록 완료'); document.getElementById('schedTitle').value=''; document.getElementById('schedDate').value=''; }
    } catch (err) { alert('오류'); }
});

// 6. 물품 관리 (목록 보기 & 추가 & 삭제)
async function loadAdminRentals() {
    adminRentalList.innerHTML = '<li>로딩 중...</li>';
    try {
        const res = await fetch('/rentals');
        const items = await res.json();
        adminRentalList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.style.padding = '10px';
            li.style.borderBottom = '1px solid #eee';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.innerHTML = `
                <span>${item.item_name}</span>
                <button onclick="deleteItem(${item.id})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px;">삭제</button>
            `;
            adminRentalList.appendChild(li);
        });
    } catch (err) { adminRentalList.innerHTML = '오류'; }
}

addRentalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/admin/rental-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemName: document.getElementById('newItemName').value })
        });
        if (res.ok) { alert('추가됨'); document.getElementById('newItemName').value=''; loadAdminRentals(); }
    } catch (err) { alert('오류'); }
});

window.deleteItem = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`/admin/rental-item/${id}`, { method: 'DELETE' });
        if(res.ok) { alert('삭제됨'); loadAdminRentals(); }
    } catch (err) { alert('오류'); }
}

// 초기 실행
loadSettings();
loadPendingUsers();
loadAdminRentals();