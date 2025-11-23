// =========================================
// [1] DOM 요소 선택
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
const noticeDetailModal = document.getElementById('noticeDetailModal');

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

if (storedInfo) updateLoginState(true, storedInfo, storedId);

function updateLoginState(isLoggedIn, infoText = "", userId = "") {
    if (isLoggedIn) {
        authBtn.innerText = "로그아웃";
        userDisplay.innerText = infoText + "님";
        
        if (userId === 'admin') {
            if (!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.innerText = "⚙️관리자";
                adminBtn.className = "admin-btn-style"; // CSS 클래스 사용 권장 (style.css참조)
                adminBtn.style.marginLeft = "10px"; 
                adminBtn.style.cursor = "pointer";
                adminBtn.style.background = "#6c757d";
                adminBtn.style.color = "white";
                adminBtn.style.border = "none";
                adminBtn.style.padding = "5px 10px";
                adminBtn.style.borderRadius = "5px";

                adminBtn.onclick = () => { window.location.href = '/admin.html'; };
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
// [3] UI 이벤트 (모달, 탭)
// =========================================

// 3-1. 로그인/로그아웃
authBtn.addEventListener('click', () => {
    if (authBtn.innerText === "로그인") {
        loginView.style.display = 'block';
        registerView.style.display = 'none';
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

// 3-2. 닫기 버튼들
document.getElementById('closeModalBtn').addEventListener('click', () => modal.style.display = 'none');
document.getElementById('closeRentModalBtn').addEventListener('click', () => rentModal.style.display = 'none');
document.getElementById('closeReturnModalBtn').addEventListener('click', () => returnModal.style.display = 'none');
document.getElementById('closeNoticeModalBtn').addEventListener('click', () => noticeDetailModal.style.display = 'none');

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === rentModal) rentModal.style.display = 'none';
    if (e.target === returnModal) returnModal.style.display = 'none';
    if (e.target === noticeDetailModal) noticeDetailModal.style.display = 'none';
});

// 3-3. 화면 전환
document.getElementById('showRegisterBtn').addEventListener('click', () => { loginView.style.display = 'none'; registerView.style.display = 'block'; });
document.getElementById('showLoginBtn').addEventListener('click', () => { registerView.style.display = 'none'; loginView.style.display = 'block'; });


// =========================================
// [4] 데이터 로딩
// =========================================

// [4-1] 설정 로드
async function loadSettings() {
    try {
        const res = await fetch('/settings');
        const data = await res.json();
        
        if(footerBizName) footerBizName.innerText = data.business_name || '첨성';
        if(footerAddress) footerAddress.innerText = data.address || '';
        if(footerContact) footerContact.innerText = data.contact || '';
        if(footerSitemap) footerSitemap.innerText = data.sitemap_text || '';

        if (data.banner_image) {
            textLogo.style.display = 'none';
            bannerLogo.src = data.banner_image;
            bannerLogo.style.display = 'block';
        } else {
            textLogo.style.display = 'block';
            bannerLogo.style.display = 'none';
        }
    } catch (err) { console.error('설정 로딩 실패'); }
}

// [4-2] 공지사항 (더보기/팝업)
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
        li.onclick = () => openNoticeDetail(notice);
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; color:#333;">${notice.title}</span>
                <span style="font-size:11px; color:#aaa;">${new Date(notice.created_at).toLocaleDateString()}</span>
            </div>
            <div style="font-size:0.9rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:5px;">
                ${notice.content}
            </div>`;
        noticeList.appendChild(li);
    });

    const existingBtn = document.getElementById('moreNoticeBtn');
    if (existingBtn) existingBtn.remove();

    if (noticeShowCount < allNotices.length) {
        const moreBtn = document.createElement('div');
        moreBtn.id = 'moreNoticeBtn';
        moreBtn.innerText = "더보기 (+)";
        moreBtn.style.textAlign = "center";
        moreBtn.style.padding = "10px";
        moreBtn.style.cursor = "pointer";
        moreBtn.style.color = "#007BFF";
        moreBtn.onclick = () => { noticeShowCount += 5; renderNotices(); };
        noticeList.parentNode.appendChild(moreBtn);
    }
}

function openNoticeDetail(notice) {
    document.getElementById('detailTitle').innerText = notice.title;
    document.getElementById('detailDate').innerText = new Date(notice.created_at).toLocaleString();
    document.getElementById('detailContent').innerText = notice.content;
    noticeDetailModal.style.display = 'flex';
}

// [4-3] 일정 (D-Day)
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

// [4-4] 대여 목록 (관리자 상세 보기 포함)
async function loadRentals() {
    try {
        const res = await fetch('/rentals');
        const items = await res.json();
        rentalList.innerHTML = '';
        const currentId = localStorage.getItem('userId');
        const isAdmin = (currentId === 'admin');

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center";
            li.style.padding = "12px 0"; li.style.borderBottom = "1px solid #eee"; li.style.flexWrap = "wrap";

            let leftContent = `<div><span style="font-size:1rem; font-weight:bold;">${item.item_name}</span>`;
            if (isAdmin && item.is_rented === 1) {
                leftContent += `<div style="font-size:0.85rem; color:#666; margin-top:4px; background:#f1f1f1; padding:4px 8px; border-radius:4px;">👤 ${item.renter_name} (${item.renter_student_id})<br>📞 ${item.renter_phone || '-'}</div>`;
            }
            leftContent += `</div>`;

            let rightContent = item.is_rented === 1 
                ? `<button onclick="openReturnModal(${item.id})" style="background:#ffc107; color:black; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer; font-weight:bold;">대여중 (반납)</button>`
                : `<button onclick="openRentModal(${item.id}, '${item.item_name}')" style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer;">대여하기</button>`;
            
            li.innerHTML = leftContent + `<div style="margin-top:5px;">${rightContent}</div>`;
            rentalList.appendChild(li);
        });
    } catch (err) { rentalList.innerHTML = '<li>로딩 실패</li>'; }
}


// =========================================
// [5] 폼 제출 (로그인, 가입, 대여, 반납)
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

document.getElementById('rentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('rentItemId').value;
    const renterStudentId = document.getElementById('rentStudentId').value;
    const renterName = document.getElementById('rentName').value;
    const renterPhone = document.getElementById('rentPhone').value;
    try {
        const res = await fetch('/rentals/rent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, renterStudentId, renterName, renterPhone }) });
        const data = await res.json();
        if (res.ok) { alert('대여 완료!'); rentModal.style.display = 'none'; loadRentals(); } 
        else { alert(data.error); }
    } catch (err) { alert('오류'); }
});

document.getElementById('returnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('id', document.getElementById('returnItemId').value);
    formData.append('confirmStudentId', document.getElementById('returnStudentId').value);
    formData.append('returnPhoto', document.getElementById('returnPhoto').files[0]);
    try {
        const res = await fetch('/rentals/return', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) { alert('반납 확인됨'); returnModal.style.display = 'none'; loadRentals(); } 
        else { alert(data.error); }
    } catch (err) { alert('오류'); }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;
    try {
        const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username:u, password:p }) });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            localStorage.setItem('userInfo', `${data.studentId} ${data.name}`);
            localStorage.setItem('userId', data.username);
            location.reload();
        } else { alert(data.error); }
    } catch (err) { alert("오류"); }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('regStudentId').value;
    const nm = document.getElementById('regName').value;
    const u = document.getElementById('regUsername').value;
    const p = document.getElementById('regPassword').value;
    const cp = document.getElementById('regPasswordConfirm').value;
    if (p !== cp) { alert("비번 불일치"); return; }
    try {
        const res = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username:u, password:p, studentId:id, name:nm }) });
        const data = await res.json();
        if (res.ok) { alert(data.message); registerView.style.display = 'none'; loginView.style.display = 'block'; } 
        else { alert(data.error); }
    } catch (err) { alert("오류"); }
});

// 실행
loadSettings();
loadNotices();
loadSchedules();
loadRentals();