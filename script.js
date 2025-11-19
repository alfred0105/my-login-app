// script.js
const scheduleList = document.getElementById('scheduleList');
const scheduleForm = document.getElementById('scheduleForm');
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const closeBtn = document.getElementById('closeModalBtn');
const userDisplay = document.getElementById('userDisplay');

// 뷰(화면) 요소들
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const adminView = document.getElementById('adminView');

// 버튼 및 폼
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const backToMainBtn = document.getElementById('backToMainBtn');

// ★ 관리자 버튼 동적 생성 (헤더에 추가할 것임)
let adminBtn = null;

// --- [1] 초기 상태 확인 ---
const storedInfo = localStorage.getItem('userInfo');
const storedId = localStorage.getItem('userId'); // 관리자 체크용 아이디 저장

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

// --- [2] 관리자 기능 ---
async function openAdminPanel() {
    // 모달 열고 관리자 뷰 보여주기
    modal.style.display = 'flex';
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    adminView.style.display = 'block';

    // 대기 목록 불러오기
    const listDiv = document.getElementById('pendingList');
    listDiv.innerHTML = '<p>로딩 중...</p>';

    try {
        const res = await fetch('/admin/pending-users');
        const users = await res.json();

        if (users.length === 0) {
            listDiv.innerHTML = '<p>승인 대기 중인 회원이 없습니다.</p>';
            return;
        }

        // 목록 만들기
        let html = '<ul style="list-style:none; padding:0;">';
        users.forEach(user => {
            html += `
                <li style="border-bottom:1px solid #ddd; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${user.name}</strong> (${user.student_id})<br>
                        <span style="font-size:12px; color:#888;">ID: ${user.username}</span>
                    </div>
                    <button onclick="approveUser('${user.username}')" style="width:auto; padding:5px 10px; background-color:#28a745; margin:0;">승인</button>
                </li>
            `;
        });
        html += '</ul>';
        listDiv.innerHTML = html;

    } catch (err) {
        listDiv.innerHTML = '<p>목록을 불러오는데 실패했습니다.</p>';
    }
}

// 유저 승인 함수 (HTML 문자열 안에서 호출됨)
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
        } else {
            alert('오류 발생');
        }
    } catch (err) {
        alert('서버 통신 오류');
    }
};

backToMainBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});


// --- [3] 기본 버튼 이벤트 ---
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
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

showRegisterBtn.addEventListener('click', () => {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
});
showLoginBtn.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display = 'block';
});


// --- [4] 로그인 요청 ---
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
            localStorage.setItem('userId', data.username); // 관리자 체크용
            
            modal.style.display = 'none';
            location.reload(); 
        } else {
            // 승인 대기 중일 경우 에러 메시지 출력됨
            alert(data.error); 
        }
    } catch (err) {
        console.error(err);
        alert("서버와 연결할 수 없습니다.");
    }
});


// --- [5] 회원가입 요청 ---
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
            alert(data.message); // "승인 후 이용 가능합니다" 메시지
            registerView.style.display = 'none';
            loginView.style.display = 'block';
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert("서버 오류가 발생했습니다.");
    }
});
// --- [6] 공지사항 기능 ---

// --- [6] 공지사항 기능 (삭제 버튼 추가됨) ---
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();
        noticeList.innerHTML = '';

        if (notices.length === 0) {
            noticeList.innerHTML = '<li>등록된 공지사항이 없습니다.</li>';
        }

        // 현재 로그인한 사람이 관리자(admin)인지 확인
        const currentId = localStorage.getItem('userId'); 
        const isAdmin = (currentId === 'admin');

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.style.borderBottom = "1px solid #eee";
            li.style.padding = "8px 0";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            // 내용 HTML
            let html = `
                <span style="cursor:pointer;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">
                    ${notice.title}
                </span>
            `;

            // ★ 관리자라면 삭제 버튼(X) 추가
            if (isAdmin) {
                html += `
                    <button onclick="deleteNotice(${notice.id})" 
                            style="background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; line-height:18px; margin-left:5px;">
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
    if(!confirm('정말 삭제하시겠습니까?')) return;
    try {
        await fetch(`/admin/notice/${id}`, { method: 'DELETE' });
        loadNotices(); // 목록 새로고침
    } catch(err) { alert('삭제 실패'); }
};


// --- [7] 일정(D-Day) 기능 (새로 추가됨) ---

// 1. 일정 불러오기 & D-Day 계산
async function loadSchedules() {
    try {
        const res = await fetch('/schedules');
        const schedules = await res.json();
        scheduleList.innerHTML = '';

        if (schedules.length === 0) {
            scheduleList.innerHTML = '<li>예정된 일정이 없습니다.</li>';
            return;
        }

        // 관리자 여부 확인
        const currentId = localStorage.getItem('userId');
        const isAdmin = (currentId === 'admin');
        
        const today = new Date();
        today.setHours(0,0,0,0); // 시간은 무시하고 날짜만 비교

        schedules.forEach(sched => {
            const eventDate = new Date(sched.event_date);
            const diffTime = eventDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // 일수 차이 계산

            // D-Day 글자 만들기
            let dDayText = "";
            let color = "black";

            if (diffDays === 0) {
                dDayText = "D-Day";
                color = "red";
            } else if (diffDays > 0) {
                dDayText = `D-${diffDays}`;
                color = "blue";
            } else {
                dDayText = `D+${Math.abs(diffDays)}`; // 지난 일정
                color = "#888";
            }

            const li = document.createElement('li');
            li.style.padding = "10px 0";
            li.style.borderBottom = "1px solid #eee";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";

            let html = `
                <div>
                    <strong style="color:${color}; margin-right:10px;">${dDayText}</strong>
                    <span>${sched.title}</span>
                    <br>
                    <span style="font-size:12px; color:#aaa;">${sched.event_date.split('T')[0]}</span>
                </div>
            `;

            // 관리자면 삭제 버튼 추가
            if (isAdmin) {
                html += `
                    <button onclick="deleteSchedule(${sched.id})" 
                            style="background:#dc3545; color:white; border:none; border-radius:3px; padding:2px 5px; font-size:11px; cursor:pointer; height:25px;">
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
        loadSchedules();
    } catch(err) { alert('삭제 실패'); }
};

// 2. 일정 등록하기
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
            alert('일정이 등록되었습니다.');
            document.getElementById('schedTitle').value = '';
            document.getElementById('schedDate').value = '';
            loadSchedules();
        }
    } catch (err) { alert('오류 발생'); }
});

// 페이지 시작 시 실행
loadNotices();
loadSchedules(); // ★ 추가
