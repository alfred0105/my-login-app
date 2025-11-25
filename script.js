// [1] DOM 요소 선택
const authBtn = document.getElementById('authBtn');
const userDisplay = document.getElementById('userDisplay');
const modal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const noticeList = document.getElementById('noticeList');
const scheduleList = document.getElementById('scheduleList');
const rentalList = document.getElementById('rentalList');
const rentModal = document.getElementById('rentModal');
const returnModal = document.getElementById('returnModal');
const noticeDetailModal = document.getElementById('noticeDetailModal');

const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');

// 설정 요소
const textLogo = document.getElementById('textLogo');
const bannerLogo = document.getElementById('bannerLogo');
const footerBizName = document.getElementById('footerBizName');
const footerAddress = document.getElementById('footerAddress');
const footerContact = document.getElementById('footerContact');
const footerSitemap = document.getElementById('footerSitemap');

let adminBtn = null;

// [2] 초기화 및 로그인 관리
const storedInfo = localStorage.getItem('userInfo');
const storedId = localStorage.getItem('userId');
const storedToken = localStorage.getItem('token');

// 중복 로그인 체크 & UI 초기화
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

// [3] 이벤트 리스너
authBtn.addEventListener('click', () => {
    if(authBtn.innerText === "로그인") {
        document.getElementById('loginUsername').value=''; document.getElementById('loginPassword').value='';
        loginView.style.display='block'; registerView.style.display='none'; modal.style.display='flex';
    } else if(confirm('로그아웃?')) logout();
});

document.getElementById('closeModalBtn').onclick = () => modal.style.display='none';
document.getElementById('closeRentModalBtn').onclick = () => rentModal.style.display='none';
document.getElementById('closeReturnModalBtn').onclick = () => returnModal.style.display='none';
document.getElementById('closeNoticeModalBtn').onclick = () => noticeDetailModal.style.display='none';
window.onclick = (e) => { if([modal, rentModal, returnModal, noticeDetailModal].includes(e.target)) e.target.style.display='none'; };

document.getElementById('showRegisterBtn').onclick = () => { loginView.style.display='none'; registerView.style.display='block'; };
document.getElementById('showLoginBtn').onclick = () => { registerView.style.display='none'; loginView.style.display='block'; };

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        username:document.getElementById('loginUsername').value, password:document.getElementById('loginPassword').value
    })});
    const data = await res.json();
    if(res.ok) {
        localStorage.setItem('userInfo', `${data.studentId} ${data.name}`);
        localStorage.setItem('username', data.username);
        localStorage.setItem('token', data.token);
        localStorage.setItem('isAdmin', data.isAdmin);
        location.reload();
    } else alert(data.error);
};

registerForm.onsubmit = async (e) => {
    e.preventDefault();
    if(document.getElementById('regPassword').value !== document.getElementById('regPasswordConfirm').value) return alert('비번 불일치');
    const res = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        username:document.getElementById('regUsername').value, password:document.getElementById('regPassword').value,
        studentId:document.getElementById('regStudentId').value, name:document.getElementById('regName').value
    })});
    const data = await res.json();
    if(res.ok) { alert(data.message); loginView.style.display='block'; registerView.style.display='none'; } else alert(data.error);
};

// [4] 데이터 로드
async function loadSettings() {
    try {
        const res = await fetch('/settings'); const d = await res.json();
        document.body.style.backgroundColor = d.bg_color || '#f4f7f6';
        document.querySelector('.main-header').style.backgroundColor = d.header_color || '#ffffff';
        if (d.banner_image) {
            textLogo.style.display='none'; bannerLogo.src = d.banner_image; bannerLogo.style.display='block';
        } else { textLogo.style.display='block'; bannerLogo.style.display='none'; }
        footerBizName.innerText = d.business_name||''; footerAddress.innerText = d.address||'';
        footerContact.innerText = d.contact||''; footerSitemap.innerText = d.sitemap_text||'';
    } catch (e) {}
}

async function loadData() {
    // 공지
    const nRes = await fetch('/notices'); const notices = await nRes.json();
    noticeList.innerHTML = notices.slice(0,5).map(n => `<li style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="openNoticeDetail('${n.title}','${n.created_at}','${n.content.replace(/'/g,"\\'")}')"><b>${n.title}</b> <span style="float:right; font-size:0.8rem;">${new Date(n.created_at).toLocaleDateString()}</span></li>`).join('');
    // 일정
    const sRes = await fetch('/schedules'); const scheds = await sRes.json();
    scheduleList.innerHTML = scheds.map(s => {
        const d = Math.ceil((new Date(s.event_date) - new Date().setHours(0,0,0,0))/(1000*60*60*24));
        const tag = d===0?'D-Day':(d>0?`D-${d}`:`D+${Math.abs(d)}`);
        return `<li style="padding:10px; border-bottom:1px solid #eee;"><strong style="color:${d===0?'red':d>0?'blue':'gray'}">${tag}</strong> ${s.title}</li>`;
    }).join('');
    // 대여
    const rRes = await fetch('/rentals'); const rentals = await rRes.json();
    const isAdmin = localStorage.getItem('isAdmin') === '1';
    rentalList.innerHTML = rentals.map(r => {
        let btn = r.is_rented 
            ? (isAdmin ? `<div style="font-size:0.8rem; background:#eee;">${r.renter_name}</div>` : `<button onclick="openReturnModal(${r.id})" style="background:#ffc107; border:none; border-radius:5px; padding:5px;">대여중(반납)</button>`)
            : `<button onclick="openRentModal(${r.id}, '${r.item_name}')" style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px;">대여하기</button>`;
        return `<li style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${r.item_name}</span><div>${btn}</div></li>`;
    }).join('');
}

window.openNoticeDetail = (t,d,c) => {
    document.getElementById('detailTitle').innerText=t; document.getElementById('detailDate').innerText=new Date(d).toLocaleString();
    document.getElementById('detailContent').innerText=c; noticeDetailModal.style.display='flex';
};
window.openRentModal = (id, nm) => { document.getElementById('rentItemId').value=id; document.getElementById('rentItemName').innerText=nm; rentModal.style.display='flex'; };
window.openReturnModal = (id) => { document.getElementById('returnItemId').value=id; returnModal.style.display='flex'; };

document.getElementById('rentForm').onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/rentals/rent', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        id:document.getElementById('rentItemId').value, renterStudentId:document.getElementById('rentStudentId').value,
        renterName:document.getElementById('rentName').value, renterPhone:document.getElementById('rentPhone').value
    })});
    if(res.ok) { alert('완료'); rentModal.style.display='none'; } else { const d=await res.json(); alert(d.error); }
};

document.getElementById('returnForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('returnItemId').value);
    fd.append('confirmStudentId', document.getElementById('returnStudentId').value);
    fd.append('returnPhoto', document.getElementById('returnPhoto').files[0]);
    const res = await fetch('/rentals/return', { method:'POST', body:fd });
    if(res.ok) { alert('완료'); returnModal.style.display='none'; } else { const d=await res.json(); alert(d.error); }
};

// [★ 핵심] 실시간 업데이트 수신
if(typeof io !== 'undefined') {
    const socket = io();
    socket.on('update_notices', loadData);
    socket.on('update_schedules', loadData);
    socket.on('update_rentals', loadData);
    socket.on('update_settings', loadSettings);
}

loadSettings();
loadData();