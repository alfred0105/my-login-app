// script.js - 공지사항 표시 수정 & 일정 수정 기능 추가

// =========================================
// [1] 요소 선택
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

let adminBtn = null;


// =========================================
// [2] 초기 상태 및 로그인 관리
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
        if (adminBtn) {
            adminBtn.remove();
            adminBtn = null;
        }
    }
}


// =========================================
// [3] 모달 및 화면 전환
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
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
backToMainBtn.addEventListener('click', () => { modal.style.display = 'none'; });

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
            listDiv.innerHTML = '<p style="text-align:center; color:#666;">대기 중인 회원이 없습니다.</p>';
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
    } catch (err) { listDiv.innerHTML = '<p>실패</p>'; }
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


// =========================================
// [5] 데이터 불러오기 (공지 & 일정)
// =========================================

// 5-1. 공지사항
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();
        noticeList.innerHTML = '';

        if (notices.length === 0) {
            noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">공지사항이 없습니다.</li>';
        }

        const currentId = localStorage.getItem('userId'); 
        const isAdmin = (currentId === 'admin');

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.style.borderBottom = "1px solid #eee";
            li.style.padding = "10px 5px";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            let html = `
                <span style="cursor:pointer; flex-grow:1;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">${notice.title}</span>
                <span style="font-size:11px; color:#aaa; margin-left:10px;">${new Date(notice.created_at).toLocaleDateString()}</span>
            `;

            if (isAdmin) {
                html += `<button onclick="deleteNotice(${notice.id})" style="background:#ff4d4d; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; margin-left:8px;">X</button>`;
            }
            li.innerHTML = html;
            noticeList.appendChild(li);
        });
    } catch (err) { noticeList.innerHTML = '<li>로딩 실패</li>'; }
}

window.deleteNotice = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await fetch(`/admin/notice/${id}`, { method: 'DELETE' }); loadNotices(); }
    catch(err) { alert('실패'); }
};


// 5-2. 일정 불러오기 (★ 수정 버튼 추가됨)
async function loadSchedules() {
    try {
        const res = await fetch('/schedules');
        const schedules = await res.json();
        scheduleList.innerHTML = '';

        if (schedules.length === 0) {
            scheduleList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">일정이 없습니다.</li>';
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
            
            // 날짜 형식 YYYY-MM-DD로 맞추기
            const dateStr = sched.event_date.split('T')[0];

            const li = document.createElement('li');
            li.style.padding = "12px 5px";
            li.style.borderBottom = "1px solid #eee";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            let html = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="color:${color}; min-width:45px;">${dDayText}</strong>
                    <div><span>${sched.title}</span><br><span style="font-size:11px; color:#aaa;">${dateStr}</span></div>
                </div>
            `;

            // ★ 관리자라면 [수정] [삭제] 버튼 표시
            if (isAdmin) {
                html += `
                    <div style="display:flex; gap:5px;">
                        <button onclick="editSchedule(${sched.id}, '${sched.title}', '${dateStr}')" 
                                style="background:#007bff; color:white; border:none; border-radius:3px; padding:4px 8px; font-size:11px; cursor:pointer;">수정</button>
                        <button onclick="deleteSchedule(${sched.id})" 
                                style="background:#dc3545; color:white; border:none; border-radius:3px; padding:4px 8px; font-size:11px; cursor:pointer;">삭제</button>
                    </div>`;
            }

            li.innerHTML = html;
            scheduleList.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

// [추가됨] 일정 수정 함수
window.editSchedule = async (id, oldTitle, oldDate) => {
    const newTitle = prompt("새로운 일정 이름을 입력하세요:", oldTitle);
    if (newTitle === null) return; // 취소 누름

    const newDate = prompt("새로운 날짜를 입력하세요 (YYYY-MM-DD):", oldDate);
    if (newDate === null) return; // 취소 누름

    try {
        const res = await fetch(`/admin/schedule/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, eventDate: newDate })
        });
        if (res.ok) {
            alert('수정되었습니다.');
            loadSchedules(); // 목록 새로고침
        } else { alert('수정 실패'); }
    } catch (err) { alert('서버 오류'); }
};

window.deleteSchedule = async (id) => {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await fetch(`/admin/schedule/${id}`, { method: 'DELETE' }); loadSchedules(); }
    catch(err) { alert('실패'); }
};


// =========================================
// [6] 폼 제출
// =========================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;
    try {
        const r = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) });
        const d = await r.json();
        if(r.ok) {
            alert(d.message);
            localStorage.setItem('userInfo', `${d.studentId} ${d.name}`);
            localStorage.setItem('userId', d.username);
            modal.style.display='none';
            location.reload();
        } else { alert(d.error); }
    } catch(e) { alert('연결 오류'); }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u=document.getElementById('regUsername').value, p=document.getElementById('regPassword').value;
    const s=document.getElementById('regStudentId').value, n=document.getElementById('regName').value;
    if(p !== document.getElementById('regPasswordConfirm').value) return alert("비번 불일치");

    try {
        const r = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p, studentId:s, name:n}) });
        const d = await r.json();
        if(r.ok) { alert(d.message); registerView.style.display='none'; loginView.style.display='block'; }
        else { alert(d.error); }
    } catch(e) { alert('오류'); }
});

noticeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const r = await fetch('/admin/notice', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({title:document.getElementById('noticeTitle').value, content:document.getElementById('noticeContent').value})
        });
        if(r.ok) { alert('등록됨'); document.getElementById('noticeTitle').value=''; document.getElementById('noticeContent').value=''; loadNotices(); }
    } catch(e) { alert('오류'); }
});

scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const r = await fetch('/admin/schedule', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({title:document.getElementById('schedTitle').value, eventDate:document.getElementById('schedDate').value})
        });
        if(r.ok) { alert('등록됨'); document.getElementById('schedTitle').value=''; document.getElementById('schedDate').value=''; loadSchedules(); }
    } catch(e) { alert('오류'); }
});

// =========================================
// [7] ★중요★ 페이지 로드 시 무조건 실행 (맨 아래에 위치!)
// =========================================
loadNotices();
loadSchedules();