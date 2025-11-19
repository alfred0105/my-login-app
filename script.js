// =========================================
// [1] 요소 선택 (DOM Elements)
// =========================================
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const closeBtn = document.getElementById('closeModalBtn');
const userDisplay = document.getElementById('userDisplay');

const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const adminView = document.getElementById('adminView');

const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const backToMainBtn = document.getElementById('backToMainBtn');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const noticeForm = document.getElementById('noticeForm');
const noticeList = document.getElementById('noticeList');
const scheduleForm = document.getElementById('scheduleForm');
const scheduleList = document.getElementById('scheduleList');
const addRentalForm = document.getElementById('addRentalForm'); // [★추가됨] 물품 추가 폼

const rentModal = document.getElementById('rentModal');
const returnModal = document.getElementById('returnModal');
const rentalList = document.getElementById('rentalList');

const closeRentModalBtn = document.getElementById('closeRentModalBtn');
const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');

const rentForm = document.getElementById('rentForm');
const returnForm = document.getElementById('returnForm');

let adminBtn = null;


// =========================================
// [2] 초기 상태 및 로그인/로그아웃 관리
// =========================================
const storedInfo = localStorage.getItem('userInfo');
const storedId = localStorage.getItem('userId');

if (storedInfo) {
    updateLoginState(true, storedInfo, storedId);
}

function updateLoginState(isLoggedIn, infoText = "", userId = "") {
    if (isLoggedIn) {
        authBtn.innerText = "로그아웃";
        userDisplay.innerText = infoText + "님";
        
        if (userId === 'admin') {
            if (!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.innerText = "⚙️관리자";
                adminBtn.style.marginLeft = "10px";
                adminBtn.style.cursor = "pointer";
                adminBtn.style.backgroundColor = "#6c757d";
                adminBtn.style.color = "white";
                adminBtn.style.border = "none";
                adminBtn.style.padding = "5px 10px";
                adminBtn.style.borderRadius = "5px";
                adminBtn.onclick = openAdminPanel;
                document.querySelector('.login').appendChild(adminBtn);
            }
        }
    } else {
        authBtn.innerText = "로그인";
        userDisplay.innerText = "";
        if (adminBtn) { adminBtn.remove(); adminBtn = null; }
    }
}


// =========================================
// [3] 모달 열기/닫기
// =========================================
authBtn.addEventListener('click', () => {
    if (authBtn.innerText === "로그인") {
        loginView.style.display = 'block';
        registerView.style.display = 'none';
        adminView.style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        modal.style.display = 'flex';
    } else {
        if (confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('userInfo');
            localStorage.removeItem('userId');
            alert("로그아웃 되었습니다.");
            location.reload();
        }
    }
});

closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
backToMainBtn.addEventListener('click', () => { modal.style.display = 'none'; });
closeRentModalBtn.addEventListener('click', () => { rentModal.style.display = 'none'; });
closeReturnModalBtn.addEventListener('click', () => { returnModal.style.display = 'none'; });

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === rentModal) rentModal.style.display = 'none';
    if (e.target === returnModal) returnModal.style.display = 'none';
});

showRegisterBtn.addEventListener('click', () => {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
});
showLoginBtn.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display = 'block';
});


// =========================================
// [4] 관리자 기능
// =========================================
async function openAdminPanel() {
    modal.style.display = 'flex';
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    adminView.style.display = 'block';

    const listDiv = document.getElementById('pendingList');
    listDiv.innerHTML = '<p style="text-align:center; color:#666;">로딩 중...</p>';

    try {
        const res = await fetch('/admin/pending-users');
        const users = await res.json();
        if (users.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color:#666;">승인 대기 중인 회원이 없습니다.</p>';
            return;
        }
        let html = '<ul style="list-style:none; padding:0;">';
        users.forEach(user => {
            html += `
                <li style="border-bottom:1px solid #eee; padding:10px; display:flex; justify-content:space-between; align-items:center; background:white;">
                    <div><strong>${user.name}</strong> (${user.student_id})<br><span style="font-size:12px; color:#888;">ID: ${user.username}</span></div>
                    <button onclick="approveUser('${user.username}')" style="background-color:#28a745; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">승인</button>
                </li>`;
        });
        html += '</ul>';
        listDiv.innerHTML = html;
    } catch (err) { listDiv.innerHTML = '<p>목록 불러오기 실패</p>'; }
}

window.approveUser = async (username) => {
    if (!confirm(`${username} 님을 승인하시겠습니까?`)) return;
    try {
        const res = await fetch('/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        if (res.ok) { alert('승인되었습니다.'); openAdminPanel(); }
    } catch (err) { alert('오류'); }
};

// [★추가됨] 물품 추가 기능
addRentalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemName = document.getElementById('newItemName').value;
    try {
        const res = await fetch('/admin/rental-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemName })
        });
        if (res.ok) {
            alert('물품이 추가되었습니다.');
            document.getElementById('newItemName').value = '';
            loadRentals(); // 목록 새로고침
        }
    } catch (err) { alert('오류'); }
});

// [★추가됨] 물품 삭제 기능
window.deleteRentalItem = async (id) => {
    if(!confirm('정말 이 물품을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`/admin/rental-item/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('삭제되었습니다.');
            loadRentals();
        }
    } catch (err) { alert('오류'); }
};


// =========================================
// [5] 데이터 불러오기
// =========================================

// 5-1. 공지사항
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();
        noticeList.innerHTML = '';
        if (notices.length === 0) noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">등록된 공지사항이 없습니다.</li>';

        const currentId = localStorage.getItem('userId'); 
        const isAdmin = (currentId === 'admin');

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "10px 5px";
            li.style.borderBottom = "1px solid #eee";

            let html = `<span style="cursor:pointer; flex-grow:1;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">${notice.title}</span>
                        <span style="font-size:11px; color:#aaa; margin-left:10px;">${new Date(notice.created_at).toLocaleDateString()}</span>`;
            if (isAdmin) html += `<button onclick="deleteNotice(${notice.id})" style="background:#ff4d4d; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; margin-left:8px;">X</button>`;
            li.innerHTML = html;
            noticeList.appendChild(li);
        });
    } catch (err) { noticeList.innerHTML = '<li>불러오기 실패</li>'; }
}

window.deleteNotice = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await fetch(`/admin/notice/${id}`, { method: 'DELETE' }); loadNotices(); } catch(err) { alert('실패'); }
};

// 5-2. 일정
async function loadSchedules() {
    try {
        const res = await fetch('/schedules');
        const schedules = await res.json();
        scheduleList.innerHTML = '';
        if (schedules.length === 0) { scheduleList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">예정된 일정이 없습니다.</li>'; return; }

        const currentId = localStorage.getItem('userId');
        const isAdmin = (currentId === 'admin');
        const today = new Date(); today.setHours(0,0,0,0);

        schedules.forEach(sched => {
            const eventDate = new Date(sched.event_date);
            const diffTime = eventDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let dDayText = diffDays === 0 ? "D-Day" : (diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`);
            let color = diffDays === 0 ? "#dc3545" : (diffDays > 0 ? "#007bff" : "#888");

            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "12px 5px";
            li.style.borderBottom = "1px solid #eee";
            let html = `<div style="display:flex; align-items:center; gap:10px;"><strong style="color:${color}; min-width:45px;">${dDayText}</strong><div><span>${sched.title}</span><br><span style="font-size:11px; color:#aaa;">${sched.event_date.split('T')[0]}</span></div></div>`;
            if (isAdmin) html += `<button onclick="deleteSchedule(${sched.id})" style="background:#dc3545; color:white; border:none; border-radius:3px; padding:4px 8px; font-size:11px; cursor:pointer;">삭제</button>`;
            li.innerHTML = html;
            scheduleList.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

window.deleteSchedule = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await fetch(`/admin/schedule/${id}`, { method: 'DELETE' }); loadSchedules(); } catch(err) { alert('실패'); }
};

// 5-3. [★수정됨] 물품 대여 목록 (관리자 삭제 버튼 추가)
async function loadRentals() {
    try {
        const res = await fetch('/rentals');
        const items = await res.json();
        rentalList.innerHTML = '';

        const currentId = localStorage.getItem('userId'); 
        const isAdmin = (currentId === 'admin');

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "12px 0";
            li.style.borderBottom = "1px solid #eee";

            let leftContent = `<span>${item.item_name}</span>`;
            let rightContent = '';

            if (item.is_rented === 1) {
                rightContent = `<button onclick="openReturnModal(${item.id})" style="background:#ffc107; color:black; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer; font-weight:bold;">대여중 (반납하기)</button>`;
            } else {
                rightContent = `<button onclick="openRentModal(${item.id}, '${item.item_name}')" style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer;">대여하기</button>`;
            }

            // ★ 관리자라면 삭제 버튼 추가
            if (isAdmin) {
                rightContent += `<button onclick="deleteRentalItem(${item.id})" style="background:#dc3545; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; margin-left:8px;">X</button>`;
            }

            li.innerHTML = leftContent + `<div style="display:flex; align-items:center;">${rightContent}</div>`;
            rentalList.appendChild(li);
        });
    } catch (err) { rentalList.innerHTML = '<li>목록 로딩 실패</li>'; }
}


// =========================================
// [6] 대여 및 반납, 기타 폼 처리
// =========================================
window.openRentModal = (id, name) => {
    document.getElementById('rentItemId').value = id;
    document.getElementById('rentItemName').innerText = name;
    document.getElementById('rentStudentId').value = '';
    document.getElementById('rentName').value = '';
    document.getElementById('rentPhone').value = '';
    rentModal.style.display = 'flex';
};

window.openReturnModal = (id) => {
    document.getElementById('returnItemId').value = id;
    document.getElementById('returnStudentId').value = '';
    document.getElementById('returnPhoto').value = '';
    returnModal.style.display = 'flex';
};

rentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('rentItemId').value;
    const renterStudentId = document.getElementById('rentStudentId').value;
    const renterName = document.getElementById('rentName').value;
    const renterPhone = document.getElementById('rentPhone').value;
    try {
        const res = await fetch('/rentals/rent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, renterStudentId, renterName, renterPhone })
        });
        if (res.ok) { alert('대여 완료!'); rentModal.style.display = 'none'; loadRentals(); } 
        else { const data = await res.json(); alert(data.error); }
    } catch (err) { alert('오류'); }
});

returnForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('id', document.getElementById('returnItemId').value);
    formData.append('confirmStudentId', document.getElementById('returnStudentId').value);
    formData.append('returnPhoto', document.getElementById('returnPhoto').files[0]);
    try {
        const res = await fetch('/rentals/return', { method: 'POST', body: formData });
        if (res.ok) { alert('반납 확인되었습니다.'); returnModal.style.display = 'none'; loadRentals(); }
        else { const data = await res.json(); alert(data.error); }
    } catch (err) { alert('오류'); }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            const displayText = `${data.studentId} ${data.name}`;
            localStorage.setItem('userInfo', displayText);
            localStorage.setItem('userId', data.username);
            modal.style.display = 'none';
            location.reload(); 
        } else { alert(data.error); }
    } catch (err) { alert("연결 실패"); }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('regStudentId').value;
    const name = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPw = document.getElementById('regPasswordConfirm').value;
    if (password !== confirmPw) { alert("비밀번호 불일치"); return; }
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, studentId, name })
        });
        const data = await response.json();
        if (response.ok) { alert(data.message); registerView.style.display = 'none'; loginView.style.display = 'block'; } 
        else { alert(data.error); }
    } catch (err) { alert("오류"); }
});

noticeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    try {
        const res = await fetch('/admin/notice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        if (res.ok) { alert('등록 완료'); document.getElementById('noticeTitle').value = ''; document.getElementById('noticeContent').value = ''; loadNotices(); }
    } catch (err) { alert('오류'); }
});

scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('schedTitle').value;
    const eventDate = document.getElementById('schedDate').value;
    try {
        const res = await fetch('/admin/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, eventDate })
        });
        if (res.ok) { alert('등록 완료'); document.getElementById('schedTitle').value = ''; document.getElementById('schedDate').value = ''; loadSchedules(); }
    } catch (err) { alert('오류'); }
});

// [8] 초기 로드
loadNotices();
loadSchedules();
loadRentals();