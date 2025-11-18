// script.js

// 1. 사용자 데이터 관리
// 기존 데이터에도 학번/이름 예시를 추가했습니다.
let usersDB = JSON.parse(localStorage.getItem('usersDB')) || [
    { username: "test", password: "123", studentId: "20240001", name: "홍길동" },
    { username: "admin", password: "0000", studentId: "99999999", name: "관리자" }
];

// 요소 선택
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const closeBtn = document.getElementById('closeModalBtn');
const userDisplay = document.getElementById('userDisplay');

// 화면 전환용 요소
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

// 폼 요소
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// --- [기능 1] 초기 상태 확인 ---
// 저장된 학번과 이름을 가져옵니다.
const storedInfo = localStorage.getItem('userInfo'); 
if (storedInfo) {
    updateLoginState(true, storedInfo);
}

// 상태 업데이트 함수 (infoText에 "20241234 홍길동" 같은 문자열이 들어옵니다)
function updateLoginState(isLoggedIn, infoText = "") {
    if (isLoggedIn) {
        authBtn.innerText = "로그아웃";
        userDisplay.innerText = infoText + "님"; // "20241234 홍길동님" 출력
    } else {
        authBtn.innerText = "로그인";
        userDisplay.innerText = "";
    }
}

// --- [기능 2] 모달 열기/닫기 및 화면 전환 ---
authBtn.addEventListener('click', () => {
    if (authBtn.innerText === "로그인") {
        loginView.style.display = 'block';
        registerView.style.display = 'none';
        
        // 입력창 초기화
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        
        modal.style.display = 'flex';
    } else {
        // 로그아웃
        if(confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('userInfo'); // 저장된 정보 삭제
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


// --- [기능 3] 로그인 처리 ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputId = document.getElementById('loginUsername').value;
    const inputPw = document.getElementById('loginPassword').value;

    const foundUser = usersDB.find(user => user.username === inputId && user.password === inputPw);

    if (foundUser) {
        alert("로그인 성공!");
        
        // ★ 핵심: 아이디 대신 "학번 + 이름"을 조합해서 저장
        const displayText = `${foundUser.studentId} ${foundUser.name}`;
        localStorage.setItem('userInfo', displayText);
        
        modal.style.display = 'none';
        updateLoginState(true, displayText);
        location.reload();
    } else {
        alert("아이디 또는 비밀번호가 틀렸습니다.");
    }
});


// --- [기능 4] 회원가입 처리 ---
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // 입력값 가져오기 (학번, 이름 추가됨)
    const newStudentId = document.getElementById('regStudentId').value;
    const newName = document.getElementById('regName').value;
    const newId = document.getElementById('regUsername').value;
    const newPw = document.getElementById('regPassword').value;
    const confirmPw = document.getElementById('regPasswordConfirm').value;

    if (newPw !== confirmPw) {
        alert("비밀번호가 서로 다릅니다.");
        return;
    }

    const exists = usersDB.some(user => user.username === newId);
    if (exists) {
        alert("이미 존재하는 아이디입니다.");
        return;
    }

    // DB에 학번, 이름도 같이 저장
    usersDB.push({ 
        username: newId, 
        password: newPw,
        studentId: newStudentId,
        name: newName
    });
    
    localStorage.setItem('usersDB', JSON.stringify(usersDB));

    alert("회원가입 성공! 로그인 해주세요.");
    registerView.style.display = 'none';
    loginView.style.display = 'block';
});