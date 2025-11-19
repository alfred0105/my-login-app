// script.js

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

// 1. 공지사항 불러오기 (페이지 로드 시 자동 실행)
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();

        // 목록 초기화
        noticeList.innerHTML = '';

        if (notices.length === 0) {
            noticeList.innerHTML = '<li>등록된 공지사항이 없습니다.</li>';
            return;
        }

        // 최신 5개만 보여주기 (원하면 slice 제거)
        notices.slice(0, 5).forEach(notice => {
            const li = document.createElement('li');
            // 제목 클릭 시 내용 보이게 (간단 구현)
            li.innerHTML = `
                <strong style="cursor:pointer;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">
                    ${notice.title}
                </strong>
                <span style="font-size:11px; color:#888; float:right;">${new Date(notice.created_at).toLocaleDateString()}</span>
            `;
            noticeList.appendChild(li);
        });

    } catch (err) {
        console.error(err);
        noticeList.innerHTML = '<li>불러오기 실패</li>';
    }
}

// 페이지 시작하자마자 공지사항 불러오기!
loadNotices();


// 2. 공지사항 등록하기 (관리자)
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
            alert('공지사항이 등록되었습니다.');
            // 입력창 비우기
            document.getElementById('noticeTitle').value = '';
            document.getElementById('noticeContent').value = '';
            // 목록 새로고침
            loadNotices();
        } else {
            alert('등록 실패');
        }
    } catch (err) {
        alert('서버 오류');
    }
});