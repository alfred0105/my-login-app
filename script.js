// =========================================
// [1] 요소 선택 (DOM Elements)
// =========================================
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const userDisplay = document.getElementById('userDisplay');

const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');

const noticeList = document.getElementById('noticeList');
const scheduleList = document.getElementById('scheduleList');
const rentalList = document.getElementById('rentalList');

const rentModal = document.getElementById('rentModal');
const returnModal = document.getElementById('returnModal');
const noticeDetailModal = document.getElementById('noticeDetailModal'); // 공지 팝업

// 설정 요소
const textLogo = document.getElementById('textLogo');
const bannerLogo = document.getElementById('bannerLogo');
const footerBizName = document.getElementById('footerBizName');
const footerAddress = document.getElementById('footerAddress');
const footerContact = document.getElementById('footerContact');
const footerSitemap = document.getElementById('footerSitemap');

let adminBtn = null;


// =========================================
// [2] 초기화 및 로그인 관리
// =========================================
const storedInfo = localStorage.getItem('userInfo');
const storedId = localStorage.getItem('userId');
const storedToken = localStorage.getItem('token');

if (storedId && storedToken) checkSession(storedId, storedToken);
if (storedInfo) updateLoginState(true, storedInfo, storedId);

async function checkSession(username, token) {
    try {
        const res = await fetch('/check-session', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username, token}) });
        const data = await res.json();
        if (!data.valid) { alert('다른 기기에서 접속하여 로그아웃되었습니다.'); logout(); }
    } catch (e) { logout(); }
}

function updateLoginState(isLoggedIn, infoText = "", userId = "") {
    if (isLoggedIn) {
        authBtn.innerText = "로그아웃";
        userDisplay.innerText = infoText + "님";
        if (localStorage.getItem('isAdmin') === '1') {
            if(!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.innerText = "⚙️관리자";
                adminBtn.style.cssText = "margin-left:10px; background:#6c757d; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;";
                adminBtn.onclick = () => window.location.href = '/admin.html';
                document.querySelector('.login').appendChild(adminBtn);
            }
        }
    } else {
        authBtn.innerText = "로그인";
        userDisplay.innerText = "";
        if (adminBtn) { adminBtn.remove(); adminBtn = null; }
    }
}
function logout() { localStorage.clear(); location.reload(); }


// =========================================
// [3] 이벤트 리스너 (모달 열기/닫기)
// =========================================
authBtn.addEventListener('click', () => {
    if(authBtn.innerText === "로그인") {
        document.getElementById('loginUsername').value=''; document.getElementById('loginPassword').value='';
        loginView.style.display='block'; registerView.style.display='none'; modal.style.display='flex';
    } else if(confirm('로그아웃?')) logout();
});

// 닫기 버튼들
document.getElementById('closeModalBtn').onclick = () => modal.style.display='none';
document.getElementById('closeRentModalBtn').onclick = () => rentModal.style.display='none';
document.getElementById('closeReturnModalBtn').onclick = () => returnModal.style.display='none';
// ★ 공지사항 닫기 버튼 확인 (없으면 에러나므로 체크)
const closeNoticeBtn = document.getElementById('closeNoticeModalBtn');
if(closeNoticeBtn) closeNoticeBtn.onclick = () => noticeDetailModal.style.display='none';

window.onclick = (e) => { if([modal, rentModal, returnModal, noticeDetailModal].includes(e.target)) e.target.style.display='none'; };

document.getElementById('showRegisterBtn').onclick = () => { loginView.style.display='none'; registerView.style.display='block'; };
document.getElementById('showLoginBtn').onclick = () => { registerView.style.display='none'; loginView.style.display='block'; };

// 로그인/가입 폼 제출
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;
    try {
        const res = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('userInfo', `${data.studentId} ${data.name}`);
            localStorage.setItem('username', data.username);
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            location.reload();
        } else alert(data.error);
    } catch (e) { alert('오류'); }
};

document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    if(document.getElementById('regPassword').value !== document.getElementById('regPasswordConfirm').value) return alert('비번 불일치');
    const res = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        username:document.getElementById('regUsername').value, password:document.getElementById('regPassword').value,
        studentId:document.getElementById('regStudentId').value, name:document.getElementById('regName').value
    })});
    const data = await res.json();
    if(res.ok) { alert(data.message); loginView.style.display='block'; registerView.style.display='none'; } else alert(data.error);
};


// =========================================
// [4] 데이터 로드 (공지, 일정, 대여)
// =========================================

// 설정 로드
async function loadSettings() {
    try {
        const res = await fetch('/settings'); const d = await res.json();
        document.body.style.backgroundColor = d.bg_color || '#f4f7f6';
        document.querySelector('.main-header').style.backgroundColor = d.header_color || '#ffffff';
        if (d.banner_image) {
            document.getElementById('textLogo').style.display='none';
            document.getElementById('bannerLogo').src = d.banner_image;
            document.getElementById('bannerLogo').style.display='block';
        } else { document.getElementById('textLogo').style.display='block'; document.getElementById('bannerLogo').style.display='none'; }
        document.getElementById('footerBizName').innerText = d.business_name||''; document.getElementById('footerAddress').innerText = d.address||'';
        document.getElementById('footerContact').innerText = d.contact||''; document.getElementById('footerSitemap').innerText = d.sitemap_text||'';
    } catch (e) {}
}

// ★ [핵심 수정] 공지사항 불러오기 (안전한 방식)
let allNotices = [];
let noticeShowCount = 5;

async function loadNotices() {
    try {
        const res = await fetch('/notices');
        allNotices = await res.json();
        renderNotices();
    } catch (err) { noticeList.innerHTML = '<li>로딩 실패</li>'; }
}

function renderNotices() {
    noticeList.innerHTML = '';
    const displayList = allNotices.slice(0, noticeShowCount);

    if (allNotices.length === 0) {
        noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">등록된 공지사항이 없습니다.</li>';
        return;
    }

    displayList.forEach(notice => {
        const li = document.createElement('li');
        li.style.padding = "10px 5px";
        li.style.borderBottom = "1px solid #eee";
        li.style.cursor = "pointer";
        
        // ★ 여기가 중요! 클릭 시 데이터를 통째로 넘깁니다 (따옴표 에러 해결)
        li.onclick = () => openNoticeDetail(notice);

        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; color:#333;">${notice.title}</span>
                <span style="font-size:11px; color:#aaa;">${new Date(notice.created_at).toLocaleDateString()}</span>
            </div>
            <div style="font-size:0.9rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:5px;">
                ${notice.content}
            </div>
        `;
        noticeList.appendChild(li);
    });

    // 더보기 버튼 로직
    const existingBtn = document.getElementById('moreNoticeBtn');
    if (existingBtn) existingBtn.remove();

    if (noticeShowCount < allNotices.length) {
        const moreBtn = document.createElement('div');
        moreBtn.id = 'moreNoticeBtn';
        moreBtn.innerText = "더보기 (+)";
        moreBtn.style.cssText = "text-align:center; padding:10px; cursor:pointer; color:#007BFF; font-weight:bold; font-size:0.9rem;";
        moreBtn.onclick = () => { noticeShowCount += 5; renderNotices(); };
        noticeList.parentNode.appendChild(moreBtn);
    }
}

// ★ 공지사항 팝업 열기 함수
function openNoticeDetail(notice) {
    if(document.getElementById('detailTitle')) document.getElementById('detailTitle').innerText = notice.title;
    if(document.getElementById('detailDate')) document.getElementById('detailDate').innerText = new Date(notice.created_at).toLocaleString();
    if(document.getElementById('detailContent')) document.getElementById('detailContent').innerText = notice.content;
    if(noticeDetailModal) noticeDetailModal.style.display = 'flex';
}

// 일정 불러오기
async function loadSchedules() {
    try {
        const res = await fetch('/schedules');
        const schedules = await res.json();
        scheduleList.innerHTML = '';
        if (schedules.length === 0) { scheduleList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">일정이 없습니다.</li>'; return; }

        const today = new Date(); today.setHours(0,0,0,0);
        schedules.forEach(sched => {
            const eventDate = new Date(sched.event_date);
            const diffTime = eventDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let dDayText = diffDays === 0 ? "D-Day" : (diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`);
            let color = diffDays === 0 ? "#dc3545" : (diffDays > 0 ? "#007bff" : "#888");

            const li = document.createElement('li');
            li.style.padding = "12px 5px"; li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><strong style="color:${color}; min-width:50px;">${dDayText}</strong><div><span>${sched.title}</span><br><span style="font-size:11px; color:#aaa;">${sched.event_date.split('T')[0]}</span></div></div>`;
            scheduleList.appendChild(li);
        });
    } catch (err) { scheduleList.innerHTML = '<li>로딩 실패</li>'; }
}

// 대여 목록 불러오기
async function loadRentals() {
    try {
        const res = await fetch('/rentals');
        const rentals = await res.json();
        rentalList.innerHTML = '';
        const isAdmin = localStorage.getItem('isAdmin') === '1';

        rentals.forEach(r => {
            const li = document.createElement('li');
            li.style.padding = "10px"; li.style.borderBottom = "1px solid #eee"; li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center"; li.style.flexWrap = "wrap";
            
            let btn = '';
            if (r.is_rented) {
                if (isAdmin) {
                    btn = `<div style="font-size:0.8rem; background:#eee; padding:2px 5px; border-radius:3px;">${r.renter_name} (${r.renter_student_id})</div>`;
                } else {
                    btn = `<button onclick="openReturnModal(${r.id})" style="background:#ffc107; border:none; border-radius:5px; padding:5px;">대여중(반납)</button>`;
                }
            } else {
                btn = `<button onclick="openRentModal(${r.id}, '${r.item_name}')" style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px;">대여하기</button>`;
            }
            li.innerHTML = `<div><span style="font-size:1rem; font-weight:bold;">${r.item_name}</span></div><div style="margin-top:5px;">${btn}</div>`;
            rentalList.appendChild(li);
        });
    } catch (err) { rentalList.innerHTML = '<li>로딩 실패</li>'; }
}


// =========================================
// [5] 대여 및 반납 처리
// =========================================
window.openRentModal = (id, nm) => {
    document.getElementById('rentItemId').value = id;
    document.getElementById('rentItemName').innerText = nm;
    rentModal.style.display = 'flex';
};
window.openReturnModal = (id) => {
    document.getElementById('returnItemId').value = id;
    returnModal.style.display = 'flex';
};

document.getElementById('rentForm').onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/rentals/rent', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        id:document.getElementById('rentItemId').value, renterStudentId:document.getElementById('rentStudentId').value,
        renterName:document.getElementById('rentName').value, renterPhone:document.getElementById('rentPhone').value
    })});
    const d = await res.json();
    if(res.ok) { alert('완료'); rentModal.style.display='none'; } else alert(d.error);
};

document.getElementById('returnForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('returnItemId').value);
    fd.append('confirmStudentId', document.getElementById('returnStudentId').value);
    fd.append('returnPhoto', document.getElementById('returnPhoto').files[0]);
    const res = await fetch('/rentals/return', { method:'POST', body:fd });
    const d = await res.json();
    if(res.ok) { alert('완료'); returnModal.style.display='none'; } else alert(d.error);
};


// =========================================
// [★ 핵심] 실시간 업데이트 수신 (Socket.io)
// =========================================
if (typeof io !== 'undefined') {
    const socket = io();
    // 공지가 추가되면 loadNotices 실행
    socket.on('update_notices', loadNotices);
    socket.on('update_schedules', loadSchedules);
    socket.on('update_rentals', loadRentals);
    socket.on('update_settings', loadSettings);
} else {
    console.error("Socket.io가 없습니다. HTML을 확인하세요.");
}

// 초기 로드
loadSettings();
loadNotices();
loadSchedules();
loadRentals();