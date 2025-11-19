// =========================================
// [1] 요소 선택 (DOM Elements)
// =========================================
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const closeBtn = document.getElementById('closeModalBtn');
const userDisplay = document.getElementById('userDisplay');

// 화면(View) 요소들
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const adminView = document.getElementById('adminView');

// 버튼 및 폼
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const backToMainBtn = document.getElementById('backToMainBtn');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// 공지사항 & 일정
const noticeForm = document.getElementById('noticeForm');
const noticeList = document.getElementById('noticeList');
const scheduleForm = document.getElementById('scheduleForm');
const scheduleList = document.getElementById('scheduleList');

// 대여 & 반납 모달 요소
const rentModal = document.getElementById('rentModal');
const returnModal = document.getElementById('returnModal');
const rentalList = document.getElementById('rentalList');

const closeRentModalBtn = document.getElementById('closeRentModalBtn');
const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');

const rentForm = document.getElementById('rentForm');
const returnForm = document.getElementById('returnForm');

// 관리자 버튼 (동적 생성)
let adminBtn = null;


// =========================================
// [2] 초기 상태 및 로그인/로그아웃 관리
// =========================================

// 페이지 로드 시 로그인 상태 확인
const storedInfo = localStorage.getItem('userInfo');
const storedId = localStorage.getItem('userId'); // 관리자 권한 체크용

if (storedInfo) {
    updateLoginState(true, storedInfo, storedId);
}

function updateLoginState(isLoggedIn, infoText = "", userId = "") {
    if (isLoggedIn) {
        authBtn.innerText = "로그아웃";
        userDisplay.innerText = infoText + "님";
        
        // ★ 관리자(admin)라면 '관리자 모드' 버튼 생성
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
        if (adminBtn) {
            adminBtn.remove();
            adminBtn = null;
        }
    }
}


// =========================================
// [3] 모달 열기/닫기 (로그인, 대여, 반납)
// =========================================

// 로그인/로그아웃 버튼
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

// 닫기 버튼들 연결
closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
backToMainBtn.addEventListener('click', () => { modal.style.display = 'none'; });
closeRentModalBtn.addEventListener('click', () => { rentModal.style.display = 'none'; });
closeReturnModalBtn.addEventListener('click', () => { returnModal.style.display = 'none'; });

// 배경 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === rentModal) rentModal.style.display = 'none';
    if (e.target === returnModal) returnModal.style.display = 'none';
});

// 로그인 <-> 회원가입 화면 전환
showRegisterBtn.addEventListener('click', () => {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
});
showLoginBtn.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display = 'block';
});


// =========================================
// [4] 관리자 기능 (패널, 승인, 공지/일정 등록)
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
                    <div>
                        <strong>${user.name}</strong> (${user.student_id})<br>
                        <span style="font-size:12px; color:#888;">ID: ${user.username}</span>
                    </div>
                    <button onclick="approveUser('${user.username}')" style="background-color:#28a745; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">승인</button>
                </li>
            `;
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
        if (res.ok) {
            alert('승인되었습니다.');
            openAdminPanel();
        } else { alert('오류 발생'); }
    } catch (err) { alert('서버 통신 오류'); }
};


// =========================================
// [5] 데이터 불러오기 (공지, 일정, 대여목록)
// =========================================

// 5-1. 공지사항 불러오기
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();
        noticeList.innerHTML = '';

        if (notices.length === 0) {
            noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">등록된 공지사항이 없습니다.</li>';
        }

        const currentId = localStorage.getItem('userId'); 
        const isAdmin = (currentId === 'admin');

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "10px 5px";
            li.style.borderBottom = "1px solid #eee";

            let html = `
                <span style="cursor:pointer; flex-grow:1;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">
                    ${notice.title}
                </span>
                <span style="font-size:11px; color:#aaa; margin-left:10px;">${new Date(notice.created_at).toLocaleDateString()}</span>
            `;

            if (isAdmin) {
                html += `
                    <button onclick="deleteNotice(${notice.id})" 
                            style="background:#ff4d4d; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; margin-left:8px;">X</button>`;
            }
            li.innerHTML = html;
            noticeList.appendChild(li);
        });
    } catch (err) { noticeList.innerHTML = '<li>불러오기 실패</li>'; }
}

window.deleteNotice = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try {
        await fetch(`/admin/notice/${id}`, { method: 'DELETE' });
        loadNotices();
    } catch(err) { alert('삭제 실패'); }
};

// 5-2. 일정 불러오기 (D-Day)
async function loadSchedules() {
    try {
        const res = await fetch('/schedules');
        const schedules = await res.json();
        scheduleList.innerHTML = '';

        if (schedules.length === 0) {
            scheduleList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">예정된 일정이 없습니다.</li>';
            return;
        }

        const currentId = localStorage.getItem('userId');
        const isAdmin = (currentId === 'admin');
        const today = new Date();
        today.setHours(0,0,0,0);

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

            let html = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="color:${color}; min-width:45px;">${dDayText}</strong>
                    <div>
                        <span>${sched.title}</span><br>
                        <span style="font-size:11px; color:#aaa;">${sched.event_date.split('T')[0]}</span>
                    </div>
                </div>
            `;

            if (isAdmin) {
                html += `
                    <button onclick="deleteSchedule(${sched.id})" 
                            style="background:#dc3545; color:white; border:none; border-radius:3px; padding:4px 8px; font-size:11px; cursor:pointer;">삭제</button>`;
            }
            li.innerHTML = html;
            scheduleList.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

window.deleteSchedule = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try {
        await fetch(`/admin/schedule/${id}`, { method: 'DELETE' });
        loadSchedules();
    } catch(err) { alert('삭제 실패'); }
};

// 5-3. 물품 대여 목록 불러오기
async function loadRentals() {
    try {
        const res = await fetch('/rentals');
        const items = await res.json();
        rentalList.innerHTML = '';

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
                // 대여중 -> 반납 버튼 (노란색)
                rightContent = `
                    <button onclick="openReturnModal(${item.id})" 
                            style="background:#ffc107; color:black; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer; font-weight:bold;">
                        대여중 (반납하기)
                    </button>`;
            } else {
                // 대여 가능 -> 대여 버튼 (파란색)
                rightContent = `
                    <button onclick="openRentModal(${item.id}, '${item.item_name}')" 
                            style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer;">
                        대여하기
                    </button>`;
            }

            li.innerHTML = leftContent + `<div>${rightContent}</div>`;
            rentalList.appendChild(li);
        });
    } catch (err) { rentalList.innerHTML = '<li>목록 로딩 실패</li>'; }
}


// =========================================
// [6] 대여 및 반납 (모달 열기 & 전송)
// =========================================

// 6-1. 대여 모달 열기
window.openRentModal = (id, name) => {
    document.getElementById('rentItemId').value = id;
    document.getElementById('rentItemName').innerText = name;
    document.getElementById('rentStudentId').value = '';
    document.getElementById('rentName').value = '';
    document.getElementById('rentPhone').value = '';
    rentModal.style.display = 'flex';
};

// 6-2. 반납 모달 열기
window.openReturnModal = (id) => {
    document.getElementById('returnItemId').value = id;
    document.getElementById('returnStudentId').value = '';
    document.getElementById('returnPhoto').value = '';
    returnModal.style.display = 'flex';
};

// 6-3. 대여 신청 (JSON 전송)
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
        if (res.ok) {
            alert('대여 완료! 반납 시 학번이 필요하니 기억해주세요.');
            rentModal.style.display = 'none';
            loadRentals();
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (err) { alert('서버 오류'); }
});

// 6-4. 반납 신청 (FormData - 파일 전송)
returnForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ★ 파일 업로드를 위해 FormData 사용
    const formData = new FormData();
    formData.append('id', document.getElementById('returnItemId').value);
    formData.append('confirmStudentId', document.getElementById('returnStudentId').value);
    formData.append('returnPhoto', document.getElementById('returnPhoto').files[0]);

    try {
        const res = await fetch('/rentals/return', {
            method: 'POST',
            body: formData // Content-Type 헤더 설정 안 함 (브라우저 자동 처리)
        });
        const data = await res.json();

        if (res.ok) {
            alert('반납 확인되었습니다.');
            returnModal.style.display = 'none';
            loadRentals();
        } else {
            alert(data.error); // "학번 불일치" 등
        }
    } catch (err) { alert('서버 오류'); }
});


// =========================================
// [7] 일반 폼 제출 (로그인, 가입, 공지, 일정)
// =========================================

// 로그인
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
        } else {
            alert(data.error); // 승인 대기중 등
        }
    } catch (err) { alert("서버 연결 실패"); }
});

// 회원가입
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
        if (response.ok) {
            alert(data.message);
            registerView.style.display = 'none';
            loginView.style.display = 'block';
        } else { alert(data.error); }
    } catch (err) { alert("오류 발생"); }
});

// 공지사항 등록 (관리자)
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
        if (res.ok) {
            alert('등록 완료');
            document.getElementById('noticeTitle').value = '';
            document.getElementById('noticeContent').value = '';
            loadNotices();
        }
    } catch (err) { alert('오류'); }
});

// 일정 등록 (관리자)
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
        if (res.ok) {
            alert('등록 완료');
            document.getElementById('schedTitle').value = '';
            document.getElementById('schedDate').value = '';
            loadSchedules();
        }
    } catch (err) { alert('오류'); }
});

// =========================================
// [8] 페이지 로드 시 실행
// =========================================
loadNotices();
loadSchedules();
loadRentals();