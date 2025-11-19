// script.js - 통합 버전

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

// 공지사항 & 일정 관련 폼/리스트
const noticeForm = document.getElementById('noticeForm');
const noticeList = document.getElementById('noticeList');
const scheduleForm = document.getElementById('scheduleForm');
const scheduleList = document.getElementById('scheduleList');

// 관리자 버튼 (동적 생성용 변수)
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

// 로그인 상태에 따라 화면을 바꿔주는 함수
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
                
                adminBtn.onclick = openAdminPanel; // 클릭 시 관리자 패널 열기
                document.querySelector('.login').appendChild(adminBtn);
            }
        }
    } else {
        authBtn.innerText = "로그인";
        userDisplay.innerText = "";
        if (adminBtn) {
            adminBtn.remove(); // 로그아웃 시 버튼 삭제
            adminBtn = null;
        }
    }
}


// =========================================
// [3] 모달 및 화면 전환 로직
// =========================================

// 로그인/로그아웃 버튼 클릭
authBtn.addEventListener('click', () => {
    if (authBtn.innerText === "로그인") {
        // 초기화 후 모달 열기
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

// 닫기 버튼
closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
backToMainBtn.addEventListener('click', () => { modal.style.display = 'none'; });

// 로그인 <-> 회원가입 전환
showRegisterBtn.addEventListener('click', () => {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
});
showLoginBtn.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display = 'block';
});


// =========================================
// [4] 관리자 전용 기능 (패널, 승인)
// =========================================

async function openAdminPanel() {
    modal.style.display = 'flex';
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    adminView.style.display = 'block';

    // 대기 목록 불러오기
    const listDiv = document.getElementById('pendingList');
    listDiv.innerHTML = '<p style="text-align:center; color:#666;">로딩 중...</p>';

    try {
        const res = await fetch('/admin/pending-users');
        const users = await res.json();

        if (users.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color:#666;">승인 대기 중인 회원이 없습니다.</p>';
            return;
        }

        // 목록 렌더링
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

    } catch (err) {
        listDiv.innerHTML = '<p>목록 불러오기 실패</p>';
    }
}

// 유저 승인 함수 (window 객체에 할당하여 HTML에서 호출 가능하게 함)
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
            openAdminPanel(); // 목록 새로고침
        } else { alert('오류 발생'); }
    } catch (err) { alert('서버 통신 오류'); }
};


// =========================================
// [5] 데이터 불러오기 (공지사항 & 일정)
// =========================================

// 5-1. 공지사항 불러오기 (+ 삭제 버튼)
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();
        noticeList.innerHTML = '';

        if (notices.length === 0) {
            noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">등록된 공지사항이 없습니다.</li>';
        }

        // 관리자 여부 확인
        const currentId = localStorage.getItem('userId'); 
        const isAdmin = (currentId === 'admin');

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.style.borderBottom = "1px solid #eee";
            li.style.padding = "10px 5px";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            // 내용 (클릭 시 상세 내용 alert)
            let html = `
                <span style="cursor:pointer; flex-grow:1;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">
                    ${notice.title}
                </span>
                <span style="font-size:11px; color:#aaa; margin-left:10px;">${new Date(notice.created_at).toLocaleDateString()}</span>
            `;

            // ★ 관리자라면 삭제 버튼 추가
            if (isAdmin) {
                html += `
                    <button onclick="deleteNotice(${notice.id})" 
                            style="background:#ff4d4d; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; line-height:18px; margin-left:8px;">
                        X
                    </button>`;
            }

            li.innerHTML = html;
            noticeList.appendChild(li);
        });
    } catch (err) {
        noticeList.innerHTML = '<li>불러오기 실패</li>';
    }
}

// 공지사항 삭제 함수
window.deleteNotice = async (id) => {
    if(!confirm('이 공지사항을 삭제하시겠습니까?')) return;
    try {
        await fetch(`/admin/notice/${id}`, { method: 'DELETE' });
        loadNotices(); // 새로고침
    } catch(err) { alert('삭제 실패'); }
};


// 5-2. 일정 불러오기 (+ D-Day 계산, 삭제 버튼)
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

            let dDayText = "";
            let color = "#333";

            if (diffDays === 0) {
                dDayText = "D-Day";
                color = "#dc3545"; // 빨강
            } else if (diffDays > 0) {
                dDayText = `D-${diffDays}`;
                color = "#007bff"; // 파랑
            } else {
                dDayText = `D+${Math.abs(diffDays)}`;
                color = "#888"; // 회색 (지난 일정)
            }

            const li = document.createElement('li');
            li.style.padding = "12px 5px";
            li.style.borderBottom = "1px solid #eee";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

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
                            style="background:#dc3545; color:white; border:none; border-radius:3px; padding:4px 8px; font-size:11px; cursor:pointer;">
                        삭제
                    </button>`;
            }

            li.innerHTML = html;
            scheduleList.appendChild(li);
        });

    } catch (err) {
        console.error(err);
    }
}

// 일정 삭제 함수
window.deleteSchedule = async (id) => {
    if(!confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
        await fetch(`/admin/schedule/${id}`, { method: 'DELETE' });
        loadSchedules(); // 새로고침
    } catch(err) { alert('삭제 실패'); }
};


// =========================================
// [6] 폼 제출 처리 (Form Submits)
// =========================================

// 6-1. 로그인
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
            alert(data.error); // "승인 대기 중입니다" 포함
        }
    } catch (err) {
        alert("서버와 연결할 수 없습니다.");
    }
});

// 6-2. 회원가입
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('regStudentId').value;
    const name = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPw = document.getElementById('regPasswordConfirm').value;

    if (password !== confirmPw) {
        alert("비밀번호가 서로 다릅니다.");
        return;
    }

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
        } else {
            alert(data.error);
        }
    } catch (err) { alert("서버 오류가 발생했습니다."); }
});

// 6-3. 공지사항 등록 (관리자)
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
            alert('공지사항 등록 완료');
            document.getElementById('noticeTitle').value = '';
            document.getElementById('noticeContent').value = '';
            loadNotices();
        }
    } catch (err) { alert('오류 발생'); }
});

// 6-4. 일정 등록 (관리자)
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
            alert('일정 등록 완료');
            document.getElementById('schedTitle').value = '';
            document.getElementById('schedDate').value = '';
            loadSchedules();
        }
    } catch (err) { alert('오류 발생'); }
});


// =========================================
// [7] 페이지 로드 시 실행
// =========================================
loadNotices();
loadSchedules();