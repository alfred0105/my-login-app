// =========================================
// [0] 관리자 권한 체크
// =========================================
if (localStorage.getItem('userId') !== 'admin') {
    alert('관리자 권한이 필요합니다.');
    window.location.href = '/';
}

// DOM 요소 선택
const settingsForm = document.getElementById('settingsForm');
const bannerFile = document.getElementById('bannerFile');
const pendingList = document.getElementById('pendingList');
const currentRentals = document.getElementById('currentRentals');
const logList = document.getElementById('logList');
const adminRentalList = document.getElementById('adminRentalList');

// 폼 및 목록 영역
const noticeForm = document.getElementById('noticeForm');
const scheduleForm = document.getElementById('scheduleForm');
const noticeListArea = document.createElement('div');
const scheduleListArea = document.createElement('div');

// 폼 바로 아래에 목록 영역 붙이기
if (noticeForm) noticeForm.parentNode.appendChild(noticeListArea);
if (scheduleForm) scheduleForm.parentNode.appendChild(scheduleListArea);


// =========================================
// [1] 설정 관리 (색상, 배너, 푸터)
// =========================================
async function loadSettings() {
    try {
        const res = await fetch('/settings');
        const data = await res.json();
        if (data) {
            document.getElementById('editBizName').value = data.business_name || '';
            document.getElementById('editAddress').value = data.address || '';
            document.getElementById('editContact').value = data.contact || '';
            document.getElementById('editSitemap').value = data.sitemap_text || '';
            document.getElementById('editBgColor').value = data.bg_color || '#f4f7f6';
            document.getElementById('editHeaderColor').value = data.header_color || '#ffffff';
        }
    } catch (err) { console.error(err); }
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bodyData = {
        businessName: document.getElementById('editBizName').value,
        address: document.getElementById('editAddress').value,
        contact: document.getElementById('editContact').value,
        sitemapText: document.getElementById('editSitemap').value,
        bgColor: document.getElementById('editBgColor').value,
        headerColor: document.getElementById('editHeaderColor').value
    };
    try {
        const res = await fetch('/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (res.ok) alert('저장되었습니다.');
    } catch (err) { alert('오류'); }
});

window.uploadBanner = async () => {
    const file = bannerFile.files[0];
    if (!file) return alert('파일 선택 필수');
    const formData = new FormData();
    formData.append('bannerFile', file);
    await fetch('/admin/banner', { method: 'POST', body: formData });
    alert('적용됨');
};

window.deleteBanner = async () => {
    if (confirm('배너를 삭제하시겠습니까?')) {
        await fetch('/admin/banner', { method: 'DELETE' });
        alert('삭제됨');
    }
};


// =========================================
// [2] 승인 대기 목록
// =========================================
async function loadPending() {
    if (!pendingList) return;
    try {
        const res = await fetch('/admin/pending-users');
        const users = await res.json();
        pendingList.innerHTML = '';

        if (users.length === 0) {
            pendingList.innerHTML = '<p style="padding:10px; color:#666;">대기 중인 회원이 없습니다.</p>';
            return;
        }

        users.forEach(u => {
            pendingList.innerHTML += `
            <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <span>${u.name} (${u.student_id})<br><small style="color:#888;">ID: ${u.username}</small></span>
                <button onclick="approve('${u.username}')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">승인</button>
            </div>`;
        });
    } catch (err) { pendingList.innerHTML = '로딩 실패'; }
}

window.approve = async (u) => {
    if (confirm('승인하시겠습니까?')) {
        await fetch('/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u })
        });
        // (여기서 loadPending()을 안 해도, 소켓이 받아서 자동으로 함)
    }
};


// =========================================
// [3] 물품 대여 관리 (현황, 목록, 추가, 삭제)
// =========================================
async function loadAdminRentals() {
    try {
        const res = await fetch('/rentals');
        const items = await res.json();

        // A. 대여 현황 (누가 빌렸는지)
        if (currentRentals) {
            currentRentals.innerHTML = '';
            if (items.length === 0) currentRentals.innerHTML = '<p>등록된 물품 없음</p>';
            else {
                items.forEach(item => {
                    if (item.is_rented) {
                        const diffMs = new Date() - new Date(item.rented_at);
                        const h = Math.floor(diffMs / (1000 * 60 * 60));
                        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        currentRentals.innerHTML += `
                        <div style="padding:8px; border-bottom:1px solid #eee; background:white; margin-bottom:5px; border-radius:5px;">
                            🔴 <strong>${item.item_name}</strong> <span style="font-size:0.9rem;">(${h}시간 ${m}분 전)</span>
                            <div style="font-size:0.85rem; color:#666; margin-top:4px; background:#f9f9f9; padding:5px;">
                                👤 ${item.renter_name} (${item.renter_student_id})<br>📞 ${item.renter_phone}
                            </div>
                        </div>`;
                    }
                });
                if (currentRentals.innerHTML === '') currentRentals.innerHTML = '<p style="color:#666;">현재 대여 중인 물품이 없습니다.</p>';
            }
        }

        // B. 물품 목록 (삭제 관리)
        if (adminRentalList) {
            adminRentalList.innerHTML = '';
            items.forEach(item => {
                adminRentalList.innerHTML += `
                <li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <span>${item.item_name}</span>
                    <button onclick="deleteRentalItem(${item.id})" style="background:#dc3545; color:white; border:none; padding:3px 8px; border-radius:3px; cursor:pointer; font-size:0.8rem;">삭제</button>
                </li>`;
            });
        }
    } catch (err) { console.error(err); }
}

// 물품 추가
document.getElementById('addRentalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/admin/rental-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: document.getElementById('newItemName').value })
    });
    alert('추가됨');
    document.getElementById('newItemName').value = '';
});

// 물품 삭제
window.deleteRentalItem = async (id) => {
    if (confirm('삭제하시겠습니까?')) {
        await fetch(`/admin/rental-item/${id}`, { method: 'DELETE' });
    }
};

// 반납 기록(Logs)
async function loadLogs() {
    try {
        const res = await fetch('/admin/rental-logs');
        const logs = await res.json();
        if (!logList) return;
        logList.innerHTML = '';
        
        if (logs.length === 0) {
            logList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">기록 없음</td></tr>';
            return;
        }

        logs.forEach(l => {
            const t1 = new Date(l.rented_at);
            const t2 = new Date(l.returned_at);
            let duration = "-";
            if (l.rented_at && l.returned_at) {
                const diff = t2 - t1;
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                duration = `${d}일 ${h}시간`;
            }
            logList.innerHTML += `
            <tr>
                <td>${l.item_name}</td>
                <td>${l.renter_name}<br><small>${l.renter_student_id}</small></td>
                <td>${duration}</td>
                <td>${t2.toLocaleDateString()}</td>
                <td>${l.return_image ? `<a href="${l.return_image}" target="_blank" class="photo-btn">사진</a>` : '-'}</td>
            </tr>`;
        });
    } catch (err) { console.error(err); }
}


// =========================================
// [4] 공지사항 & 일정 관리
// =========================================

// 공지 목록 조회
async function loadAdminNotices() {
    const res = await fetch('/notices');
    const notices = await res.json();
    if (!noticeListArea) return;
    
    noticeListArea.innerHTML = '<h4 style="margin-top:15px;">목록</h4><ul style="list-style:none; padding:0;">' + 
    notices.map(n => `
        <li style="padding:5px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
            <span style="max-width:150px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${n.title}</span>
            <div>
                <button onclick="openEditNotice(${n.id}, '${n.title.replace(/'/g,"\\'")}', '${n.content.replace(/'/g,"\\'").replace(/\n/g,'\\n')}')" style="background:#007BFF; color:white; border:none; margin-right:5px; padding:2px 5px; border-radius:3px; cursor:pointer;">수정</button>
                <button onclick="deleteNotice(${n.id})" style="background:#dc3545; color:white; border:none; padding:2px 5px; border-radius:3px; cursor:pointer;">삭제</button>
            </div>
        </li>`).join('') + '</ul>';
}

// 일정 목록 조회
async function loadAdminSchedules() {
    const res = await fetch('/schedules');
    const schedules = await res.json();
    if (!scheduleListArea) return;

    scheduleListArea.innerHTML = '<h4 style="margin-top:15px;">목록</h4><ul style="list-style:none; padding:0;">' + 
    schedules.map(s => `
        <li style="padding:5px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
            <span>${s.title} (${s.event_date.split('T')[0]})</span>
            <div>
                <button onclick="openEditSchedule(${s.id}, '${s.title.replace(/'/g,"\\'")}', '${s.event_date.split('T')[0]}')" style="background:#007BFF; color:white; border:none; margin-right:5px; padding:2px 5px; border-radius:3px; cursor:pointer;">수정</button>
                <button onclick="deleteSchedule(${s.id})" style="background:#dc3545; color:white; border:none; padding:2px 5px; border-radius:3px; cursor:pointer;">삭제</button>
            </div>
        </li>`).join('') + '</ul>';
}

// 등록 & 삭제 & 수정 기능
if (noticeForm) {
    noticeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/notice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('noticeTitle').value,
                content: document.getElementById('noticeContent').value
            })
        });
        alert('등록됨');
        document.getElementById('noticeTitle').value = '';
        document.getElementById('noticeContent').value = '';
    });
}

if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('schedTitle').value,
                eventDate: document.getElementById('schedDate').value
            })
        });
        alert('등록됨');
        document.getElementById('schedTitle').value = '';
        document.getElementById('schedDate').value = '';
    });
}

window.deleteNotice = async (id) => { if (confirm('삭제?')) await fetch(`/admin/notice/${id}`, { method: 'DELETE' }); };
window.deleteSchedule = async (id) => { if (confirm('삭제?')) await fetch(`/admin/schedule/${id}`, { method: 'DELETE' }); };

// 수정 모달 열기
window.openEditNotice = (id, t, c) => {
    document.getElementById('editNoticeId').value = id;
    document.getElementById('editNoticeTitle').value = t;
    document.getElementById('editNoticeContent').value = c;
    document.getElementById('editNoticeModal').style.display = 'flex';
};
window.openEditSchedule = (id, t, d) => {
    document.getElementById('editScheduleId').value = id;
    document.getElementById('editSchedTitle').value = t;
    document.getElementById('editSchedDate').value = d;
    document.getElementById('editScheduleModal').style.display = 'flex';
};

window.updateNotice = async () => {
    await fetch(`/admin/notice/${document.getElementById('editNoticeId').value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: document.getElementById('editNoticeTitle').value,
            content: document.getElementById('editNoticeContent').value
        })
    });
    alert('수정됨');
    document.getElementById('editNoticeModal').style.display = 'none';
};

window.updateSchedule = async () => {
    await fetch(`/admin/schedule/${document.getElementById('editScheduleId').value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: document.getElementById('editSchedTitle').value,
            eventDate: document.getElementById('editSchedDate').value
        })
    });
    alert('수정됨');
    document.getElementById('editScheduleModal').style.display = 'none';
};


// =========================================
// [★ 핵심] 실시간 업데이트 수신 (Socket.io)
// =========================================
// 1. HTML에 socket.io.js가 로드되었는지 확인
if (typeof io !== 'undefined') {
    const socket = io();

    // 서버가 "바꼈다!" 신호(emit)를 보내면 -> 함수 재실행
    socket.on('update_users', () => loadPending());       // 회원가입 오면 승인목록 갱신
    socket.on('update_notices', () => loadAdminNotices()); // 공지 추가/삭제 시 갱신
    socket.on('update_schedules', () => loadAdminSchedules());
    socket.on('update_rentals', () => loadAdminRentals()); // 대여/반납/추가/삭제 시 갱신
    socket.on('update_logs', () => loadLogs());           // 반납 완료 시 로그 갱신
    socket.on('update_settings', () => loadSettings());   // 설정 변경 시 갱신
} else {
    console.error("Socket.io 스크립트가 admin.html에 없습니다!");
}


// =========================================
// [6] 초기 로드
// =========================================
loadSettings();
loadPending();
loadAdminRentals();
loadLogs();
loadAdminNotices();
loadAdminSchedules();