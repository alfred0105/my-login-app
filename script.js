// =========================================
// [1] 요소 선택 (DOM Elements)
// =========================================
const modal = document.getElementById('loginModal');
const authBtn = document.getElementById('authBtn');
const closeBtn = document.getElementById('closeModalBtn');
const userDisplay = document.getElementById('userDisplay');

const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');

const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const noticeList = document.getElementById('noticeList');
const scheduleList = document.getElementById('scheduleList');
const rentalList = document.getElementById('rentalList');

const rentModal = document.getElementById('rentModal');
const returnModal = document.getElementById('returnModal');

const closeRentModalBtn = document.getElementById('closeRentModalBtn');
const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');

const rentForm = document.getElementById('rentForm');
const returnForm = document.getElementById('returnForm');

// [추가 요소 선택] 공지사항 상세 모달
const noticeDetailModal = document.getElementById('noticeDetailModal');
const closeNoticeModalBtn = document.getElementById('closeNoticeModalBtn');
const detailTitle = document.getElementById('detailTitle');
const detailDate = document.getElementById('detailDate');
const detailContent = document.getElementById('detailContent');

// 설정 관련 요소 (푸터/배너 표시용)
const footerBizName = document.getElementById('footerBizName');
const footerAddress = document.getElementById('footerAddress');
const footerContact = document.getElementById('footerContact');
const footerSitemap = document.getElementById('footerSitemap');
const textLogo = document.getElementById('textLogo');
const bannerLogo = document.getElementById('bannerLogo');

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
        
        // 관리자 버튼 생성
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
                // ★ 수정됨: 클릭 시 페이지 이동
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
// [3] 모달 열기/닫기
// =========================================
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

closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
closeRentModalBtn.addEventListener('click', () => { rentModal.style.display = 'none'; });
closeReturnModalBtn.addEventListener('click', () => { returnModal.style.display = 'none'; });

// 모달 닫기 이벤트
closeNoticeModalBtn.addEventListener('click', () => noticeDetailModal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === noticeDetailModal) noticeDetailModal.style.display = 'none'; });

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
// [4] 데이터 불러오기 (공지, 일정, 대여목록, 설정)
// =========================================

// 4-1. 설정 불러오기 (배너/푸터)
async function loadSettings() {
    try {
        const res = await fetch('/settings');
        const data = await res.json();
        
        // 푸터 적용
        footerBizName.innerText = data.business_name || '첨성';
        footerAddress.innerText = data.address || '';
        footerContact.innerText = data.contact || '';
        footerSitemap.innerText = data.sitemap_text || '';

        // 배너 적용
        if (data.banner_image) {
            textLogo.style.display = 'none';
            bannerLogo.src = data.banner_image;
            bannerLogo.style.display = 'block';
        } else {
            textLogo.style.display = 'block';
            bannerLogo.style.display = 'none';
        }
    } catch (err) { console.error('설정 로드 실패'); }
}

// 4-2. 공지사항 (삭제 버튼 제거됨)
async function loadNotices() {
    try {
        const res = await fetch('/notices');
        const notices = await res.json();
        noticeList.innerHTML = '';
        if (notices.length === 0) noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">등록된 공지사항이 없습니다.</li>';

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "10px 5px";
            li.style.borderBottom = "1px solid #eee";
            
            // 관리자라도 여기서 삭제 안 함 (admin.html에서 함)
            li.innerHTML = `
                <span style="cursor:pointer; flex-grow:1;" onclick="alert('${notice.content.replace(/\n/g, '\\n')}')">
                    ${notice.title}
                </span>
                <span style="font-size:11px; color:#aaa; margin-left:10px;">${new Date(notice.created_at).toLocaleDateString()}</span>
            `;
            noticeList.appendChild(li);
        });
    } catch (err) { noticeList.innerHTML = '<li>불러오기 실패</li>'; }
}

// 4-3. 일정 (삭제 버튼 제거됨)
async function loadSchedules() {
    try {
        const res = await fetch('/schedules');
        const schedules = await res.json();
        scheduleList.innerHTML = '';
        if (schedules.length === 0) { scheduleList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">예정된 일정이 없습니다.</li>'; return; }

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
            
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="color:${color}; min-width:45px;">${dDayText}</strong>
                    <div>
                        <span>${sched.title}</span><br>
                        <span style="font-size:11px; color:#aaa;">${sched.event_date.split('T')[0]}</span>
                    </div>
                </div>`;
            scheduleList.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

// 4-4. 물품 대여 목록 (삭제 버튼 제거, 반납 버튼만 유지)
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
                rightContent = `<button onclick="openReturnModal(${item.id})" style="background:#ffc107; color:black; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer; font-weight:bold;">대여중 (반납하기)</button>`;
            } else {
                rightContent = `<button onclick="openRentModal(${item.id}, '${item.item_name}')" style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px 10px; font-size:0.8rem; cursor:pointer;">대여하기</button>`;
            }

            li.innerHTML = leftContent + `<div>${rightContent}</div>`;
            rentalList.appendChild(li);
        });
    } catch (err) { rentalList.innerHTML = '<li>목록 로딩 실패</li>'; }
}
// [수정됨] 5-1. 공지사항 불러오기 (더보기 & 팝업 기능 적용)
let allNotices = []; // 전체 공지 저장용
let showCount = 5;   // 처음에 보여줄 개수

async function loadNotices() {
    try {
        const res = await fetch('/notices');
        allNotices = await res.json();
        
        renderNotices(); // 화면 그리기 함수 호출
    } catch (err) { noticeList.innerHTML = '<li>불러오기 실패</li>'; }
}

function renderNotices() {
    noticeList.innerHTML = '';
    const displayList = allNotices.slice(0, showCount); // 현재 개수만큼만 자름

    if (allNotices.length === 0) {
        noticeList.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">등록된 공지사항이 없습니다.</li>';
        return;
    }

    displayList.forEach(notice => {
        const li = document.createElement('li');
        li.style.padding = "10px 5px";
        li.style.borderBottom = "1px solid #eee";
        li.style.cursor = "pointer"; // 클릭 가능 표시
        
        // 클릭 시 상세 모달 열기
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

    // [더보기 버튼 로직]
    // 기존 더보기 버튼이 있으면 삭제 (중복 방지)
    const existingBtn = document.getElementById('moreNoticeBtn');
    if (existingBtn) existingBtn.remove();

    // 아직 보여줄게 남았으면 버튼 추가
    if (showCount < allNotices.length) {
        const moreBtn = document.createElement('div');
        moreBtn.id = 'moreNoticeBtn';
        moreBtn.innerText = "더보기 (+)";
        moreBtn.style.textAlign = "center";
        moreBtn.style.padding = "10px";
        moreBtn.style.cursor = "pointer";
        moreBtn.style.color = "#007BFF";
        moreBtn.style.fontSize = "0.9rem";
        moreBtn.style.fontWeight = "bold";
        
        moreBtn.onclick = () => {
            showCount += 5; // 5개씩 더 보여줌
            renderNotices(); // 다시 그리기
        };
        
        // 리스트 뒤에 버튼 붙이기
        noticeList.parentNode.appendChild(moreBtn);
    }
}

// [신규] 공지 상세 모달 열기 함수
function openNoticeDetail(notice) {
    detailTitle.innerText = notice.title;
    detailDate.innerText = new Date(notice.created_at).toLocaleString();
    detailContent.innerText = notice.content; // 줄바꿈 등 내용 그대로
    noticeDetailModal.style.display = 'flex';
}

// =========================================
// [5] 대여 및 반납, 로그인 처리
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
        if (res.ok) { alert('대여 완료! 반납 시 학번이 필요하니 기억해주세요.'); rentModal.style.display = 'none'; loadRentals(); } 
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

// [6] 초기 로드
loadSettings();
loadNotices();
loadSchedules();
loadRentals();