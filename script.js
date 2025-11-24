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

// [1] 초기화 & 세션 체크
const storedUser = localStorage.getItem('username');
const storedToken = localStorage.getItem('token');
if (storedUser && storedToken) checkSession(storedUser, storedToken);

async function checkSession(username, token) {
    try {
        const res = await fetch('/check-session', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username, token}) });
        const data = await res.json();
        if (data.valid) {
            userDisplay.innerText = localStorage.getItem('userInfo') + "님";
            authBtn.innerText = "로그아웃";
            if (localStorage.getItem('isAdmin') === '1') {
                const btn = document.createElement('button');
                btn.innerText = "⚙️관리자";
                btn.style.cssText = "margin-left:10px; background:#6c757d; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;";
                btn.onclick = () => window.location.href = '/admin.html';
                document.querySelector('.login').appendChild(btn);
            }
        } else { alert('다른 기기 접속으로 로그아웃됨'); logout(); }
    } catch (e) { logout(); }
}
function logout() { localStorage.clear(); location.reload(); }

// [2] 설정 로드
async function loadSettings() {
    try {
        const res = await fetch('/settings');
        const data = await res.json();
        document.body.style.backgroundColor = data.bg_color || '#f4f7f6';
        document.querySelector('.main-header').style.backgroundColor = data.header_color || '#ffffff';
        if (data.banner_image) {
            document.getElementById('textLogo').style.display='none';
            document.getElementById('bannerLogo').src = data.banner_image;
            document.getElementById('bannerLogo').style.display='block';
        }
        document.getElementById('footerBizName').innerText = data.business_name || '';
        document.getElementById('footerAddress').innerText = data.address || '';
        document.getElementById('footerContact').innerText = data.contact || '';
        document.getElementById('footerSitemap').innerText = data.sitemap_text || '';
    } catch (e) {}
}

// [3] 이벤트
authBtn.addEventListener('click', () => { if(authBtn.innerText==="로그인") modal.style.display='flex'; else if(confirm('로그아웃?')) logout(); });
document.getElementById('closeModalBtn').addEventListener('click', () => modal.style.display='none');
document.getElementById('closeRentModalBtn').addEventListener('click', () => rentModal.style.display='none');
document.getElementById('closeReturnModalBtn').addEventListener('click', () => returnModal.style.display='none');
document.getElementById('closeNoticeModalBtn').addEventListener('click', () => noticeDetailModal.style.display='none');
window.onclick = (e) => { if([modal, rentModal, returnModal, noticeDetailModal].includes(e.target)) e.target.style.display='none'; };
document.getElementById('showRegisterBtn').onclick = () => { document.getElementById('loginView').style.display='none'; document.getElementById('registerView').style.display='block'; };
document.getElementById('showLoginBtn').onclick = () => { document.getElementById('registerView').style.display='none'; document.getElementById('loginView').style.display='block'; };

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:document.getElementById('loginUsername').value, password:document.getElementById('loginPassword').value}) });
    const data = await res.json();
    if (res.ok) {
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
    if(res.ok) { alert(data.message); location.reload(); } else alert(data.error);
};

// [4] 데이터 로드
async function loadData() {
    // 공지
    const nRes = await fetch('/notices');
    const notices = await nRes.json();
    noticeList.innerHTML = '';
    const display = notices.slice(0, 5);
    display.forEach(n => {
        const li = document.createElement('li');
        li.style.padding='10px'; li.style.borderBottom='1px solid #eee'; li.style.cursor='pointer';
        li.innerHTML = `<b>${n.title}</b> <span style="float:right; font-size:0.8rem;">${new Date(n.created_at).toLocaleDateString()}</span>`;
        li.onclick = () => { document.getElementById('detailTitle').innerText=n.title; document.getElementById('detailDate').innerText=new Date(n.created_at).toLocaleString(); document.getElementById('detailContent').innerText=n.content; noticeDetailModal.style.display='flex'; };
        noticeList.appendChild(li);
    });

    // 일정
    const sRes = await fetch('/schedules');
    const scheds = await sRes.json();
    scheduleList.innerHTML = scheds.map(s => {
        const d = Math.ceil((new Date(s.event_date) - new Date().setHours(0,0,0,0))/(1000*60*60*24));
        const tag = d===0?'D-Day':(d>0?`D-${d}`:`D+${Math.abs(d)}`);
        return `<li style="padding:10px; border-bottom:1px solid #eee;"><strong style="color:${d===0?'red':'blue'}">${tag}</strong> ${s.title}</li>`;
    }).join('');

    // 대여
    const rRes = await fetch('/rentals');
    const rentals = await rRes.json();
    const isAdmin = localStorage.getItem('isAdmin') === '1';
    rentalList.innerHTML = rentals.map(r => {
        let btn = r.is_rented 
            ? (isAdmin ? `<div style="font-size:0.8rem; background:#eee;">${r.renter_name} (${r.renter_student_id})</div>` : `<button onclick="openReturnModal(${r.id})" style="background:#ffc107; border:none; border-radius:5px; padding:5px;">대여중(반납)</button>`)
            : `<button onclick="openRentModal(${r.id}, '${r.item_name}')" style="background:#007BFF; color:white; border:none; border-radius:5px; padding:5px;">대여하기</button>`;
        return `<li style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${r.item_name}</span><div>${btn}</div></li>`;
    }).join('');
}

window.openRentModal = (id, nm) => { document.getElementById('rentItemId').value=id; document.getElementById('rentItemName').innerText=nm; rentModal.style.display='flex'; };
window.openReturnModal = (id) => { document.getElementById('returnItemId').value=id; returnModal.style.display='flex'; };

document.getElementById('rentForm').onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/rentals/rent', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        id:document.getElementById('rentItemId').value, renterStudentId:document.getElementById('rentStudentId').value,
        renterName:document.getElementById('rentName').value, renterPhone:document.getElementById('rentPhone').value
    })});
    const d = await res.json(); if(res.ok) { alert('완료'); rentModal.style.display='none'; loadData(); } else alert(d.error);
};

document.getElementById('returnForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('returnItemId').value);
    fd.append('confirmStudentId', document.getElementById('returnStudentId').value);
    fd.append('returnPhoto', document.getElementById('returnPhoto').files[0]);
    const res = await fetch('/rentals/return', { method:'POST', body:fd });
    const d = await res.json(); if(res.ok) { alert('완료'); returnModal.style.display='none'; loadData(); } else alert(d.error);
};

loadSettings();
loadData();