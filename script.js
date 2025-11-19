// script.js

// 요소 선택
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const closeBtn = document.getElementById('closeModalBtn');
const userDisplay = document.getElementById('userDisplay');

// 화면 전환용 (로그인 <-> 회원가입)
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

// 폼 요소
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');


// --- [기능 1] 페이지 로드 시 로그인 상태 확인 ---
// 브라우저(Local Storage)에 저장된 표시용 이름이 있는지 확인
const storedInfo = localStorage.getItem('userInfo');
if (storedInfo) {
    updateLoginState(true, storedInfo);
}

// 화면 업데이트 함수
function updateLoginState(isLoggedIn, infoText = "") {
    if (isLoggedIn) {
        authBtn.innerText = "로그아웃";
        userDisplay.innerText = infoText + "님";
    } else {
        authBtn.innerText = "로그인";
        userDisplay.innerText = "";
    }
}


// --- [기능 2] 버튼 클릭 이벤트 (모달 열기 / 로그아웃) ---
authBtn.addEventListener('click', () => {
    if (authBtn.innerText === "로그인") {
        // 로그인 창 열 때 초기화
        loginView.style.display = 'block';
        registerView.style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        modal.style.display = 'flex';
    } else {
        // 로그아웃 기능
        if (confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('userInfo'); // 브라우저 기억 삭제
            alert("로그아웃 되었습니다.");
            location.reload(); // 새로고침
        }
    }
});

// 닫기 버튼들
closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

// 화면 전환 (회원가입 <-> 로그인)
showRegisterBtn.addEventListener('click', () => {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
});
showLoginBtn.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display = 'block';
});


// --- [기능 3] 로그인 요청 (★핵심: 서버로 데이터 전송) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // 가짜 배열(usersDB)을 뒤지는 게 아니라, 진짜 서버(/login)에 물어봅니다.
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message); // "로그인 성공"
            
            // 성공하면 학번+이름을 브라우저에 저장 (화면 표시용)
            const displayText = `${data.studentId} ${data.name}`;
            localStorage.setItem('userInfo', displayText);
            
            modal.style.display = 'none';
            location.reload(); 
        } else {
            // 서버가 거절하면 (DB에 없거나 비번 틀림)
            alert(data.error); 
        }
    } catch (err) {
        console.error(err);
        alert("서버와 연결할 수 없습니다.");
    }
});


// --- [기능 4] 회원가입 요청 (★핵심: 서버로 데이터 전송) ---
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
        // 서버(/register)에 저장을 요청합니다.
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, studentId, name })
        });

        const data = await response.json();

        if (response.ok) {
            alert("회원가입 성공! 로그인 해주세요.");
            registerView.style.display = 'none';
            loginView.style.display = 'block';
        } else {
            alert(data.error); // "이미 존재하는 아이디입니다" 등
        }
    } catch (err) {
        console.error(err);
        alert("서버 오류가 발생했습니다.");
    }
});