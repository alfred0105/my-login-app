// =========================================
// [0] 관리자 권한 체크 & 요소 선택
// =========================================

// 관리자가 아니면 메인으로 쫓아냄
const userId = localStorage.getItem('userId');
if (userId !== 'admin') {
    alert('관리자 권한이 필요합니다.');
    window.location.href = '/';
}

// 요소 선택
const settingsForm = document.getElementById('settingsForm');
const bannerFile = document.getElementById('bannerFile');
const pendingList = document.getElementById('pendingList');
const currentRentals = document.getElementById('currentRentals');
const logList = document.getElementById('logList');
const adminRentalList = document.getElementById('adminRentalList');

// 컨텐츠 등록 폼
const noticeForm = document.getElementById('noticeForm');
const scheduleForm = document.getElementById('scheduleForm');

// 목록을 표시할 영역 생성 (폼 바로 아래에 붙임)
const noticeListArea = document.createElement('div');
const scheduleListArea = document.createElement('div');
noticeForm.parentNode.appendChild(noticeListArea);
scheduleForm.parentNode.appendChild(scheduleListArea);


// =========================================
// [1] 사이트 설정 (배너 & 푸터)
// =========================================

// 1-1. 설정값 불러오기
async function loadSettings() {
    try {
        const res = await fetch('/settings');
        const data = await res.json();
        if (data) {
            document.getElementById('editBizName').value = data.business_name || '';
            document.getElementById('editAddress').value = data.address || '';
            document.getElementById('editContact').value = data.contact || '';
            document.getElementById('editSitemap').value = data.sitemap_text || '';
        }
    } catch (err) { console.error('설정 로드 실패:', err); }
}

// 1-2. 텍스트 설정 저장
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bodyData = {
        businessName: document.getElementById('editBizName').value,
        address: document.getElementById('editAddress').value,
        contact: document.getElementById('editContact').value,
        sitemapText: document.getElementById('editSitemap').value
    };
    try {
        const res = await fetch('/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (res.ok) alert('저장되었습니다.');
        else alert('저장 실패');
    } catch (err) { alert('오류 발생'); }
});

// 1-3. 배너 이미지 관리
window.uploadBanner = async () => {
    const file = bannerFile.files[0];
    if (!file) return alert('파일을 선택해주세요.');
    const formData = new FormData();
    formData.append('bannerFile', file);
    
    try {
        const res = await fetch('/admin/banner', { method: 'POST', body: formData });
        if (res.ok) alert('배너가 적용되었습니다.');
    } catch (err) { alert('오류'); }
};

window.deleteBanner = async () => {
    if(confirm('배너를 삭제하시겠습니까?')) { 
        await fetch('/admin/banner', { method: 'DELETE' }); 
        alert('삭제되었습니다.'); 
    }
};


// =========================================
// [2] 승인 대기 목록 관리
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
    if(confirm('승인하시겠습니까?')) {
        await fetch('/admin/approve', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})}); 
        loadPending(); 
    }
};


// =========================================
// [3] 물품 대여 관리 (현황, 추가, 삭제, 기록)
// =========================================

// 3-1. 대여 현황 불러오기 (현재 빌려간 상태)
async function loadAdminRentals() {
    try {
        const res = await fetch('/rentals');
        const items = await res.json();
        
        // A. 대여 현황 박스 채우기
        if (currentRentals) {
            currentRentals.innerHTML = '';
            if(items.length === 0) { 
                currentRentals.innerHTML = '<p style="color:#666;">등록된 물품이 없습니다.</p>'; 
            } else {
                const ul = document.createElement('ul');
                ul.style.listStyle = 'none'; ul.style.padding = 0;

                items.forEach(item => {
                    const li = document.createElement('li');
                    li.style.padding = '10px'; 
                    li.style.borderBottom = '1px solid #eee';
                    li.style.background = 'white'; li.style.marginBottom = '5px'; li.style.borderRadius = '5px';
                    
                    let html = `<div><strong>${item.item_name}</strong>`;

                    if (item.is_rented === 1) {
                        html += ` <span style="color:red; font-weight:bold;">[대여중]</span>`;
                        html += `<div style="font-size:0.9rem; color:#555; margin-top:5px; background:#f9f9f9; padding:5px;">
                                    👤 ${item.renter_name || '-'} (${item.renter_student_id || '-'})<br>
                                    📞 ${item.renter_phone || '-'}<br>`;
                        
                        if (item.rented_at) {
                            const rentDate = new Date(item.rented_at);
                            const diffMs = new Date() - rentDate;
                            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            html += `⏱️ ${diffHrs}시간 ${diffMins}분 전 대여`;
                        } else { html += `⏱️ 시간 정보 없음`; }
                        html += `</div>`;
                    } else {
                        html += ` <span style="color:green; font-weight:bold;">[대여가능]</span>`;
                    }
                    html += `</div>`;
                    li.innerHTML = html;
                    ul.appendChild(li);
                });
                currentRentals.appendChild(ul);
            }
        }

        // B. 물품 삭제 관리 리스트 채우기
        if (adminRentalList) {
            adminRentalList.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('li');
                li.style.padding = '10px';
                li.style.borderBottom = '1px solid #eee';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.innerHTML = `
                    <span>${item.item_name}</span>
                    <button onclick="deleteRentalItem(${item.id})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">삭제</button>
                `;
                adminRentalList.appendChild(li);
            });
        }
    } catch (err) { console.error(err); }
}

// 3-2. 물품 추가/삭제
const addRentalForm = document.getElementById('addRentalForm');
if (addRentalForm) {
    addRentalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/rental-item', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            itemName:document.getElementById('newItemName').value
        })}); 
        alert('추가되었습니다.'); 
        document.getElementById('newItemName').value=''; 
        loadAdminRentals();
    });
}

window.deleteRentalItem = async (id) => { 
    if(confirm('정말 삭제하시겠습니까?')) { 
        await fetch(`/admin/rental-item/${id}`, {method:'DELETE'}); 
        loadAdminRentals(); 
    } 
};

// 3-3. 반납 기록(Logs) 보기
async function loadLogs() {
    try {
        const res = await fetch('/admin/rental-logs');
        const logs = await res.json();
        if (!logList) return;
        logList.innerHTML = '';

        if (logs.length === 0) {
            logList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">기록이 없습니다.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const rentTime = new Date(log.rented_at);
            const returnTime = new Date(log.returned_at);
            
            let duration = "정보 없음";
            if (log.rented_at && log.returned_at) {
                const diffMs = returnTime - rentTime;
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = `${days}일 ${hours}시간 ${mins}분`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.item_name}</td>
                <td>${log.renter_name}<br><span style="font-size:0.8rem; color:#888;">${log.renter_student_id}</span></td>
                <td>${duration}</td>
                <td>${returnTime.toLocaleDateString()}</td>
                <td>${log.return_image ? `<a href="${log.return_image}" target="_blank" style="background:#17a2b8; color:white; padding:3px 8px; border-radius:3px; text-decoration:none; font-size:12px;">사진보기</a>` : '없음'}</td>
            `;
            logList.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}


// =========================================
// [4] 공지 & 일정 관리 (등록/수정/삭제)
// =========================================

// 4-1. 공지사항 관리
async function loadAdminNotices() {
    const res = await fetch('/notices');
    const notices = await res.json();
    noticeListArea.innerHTML = '<h4 style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">등록된 공지 목록</h4>';
    
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none'; ul.style.padding = 0;

    notices.forEach(n => {
        const li = document.createElement('li');
        li.style.padding = '5px 0'; li.style.borderBottom = '1px solid #eee';
        li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
        
        // 작은 따옴표 이스케이프 처리
        const safeTitle = n.title.replace(/'/g, "\\'");
        const safeContent = n.content.replace(/'/g, "\\'").replace(/\n/g, '\\n');

        li.innerHTML = `
            <span style="font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px;">${n.title}</span>
            <div>
                <button onclick="openEditNotice(${n.id}, '${safeTitle}', '${safeContent}')" style="background:#007BFF; color:white; border:none; padding:2px 5px; font-size:11px; border-radius:3px; margin-right:5px; cursor:pointer;">수정</button>
                <button onclick="deleteNotice(${n.id})" style="background:#dc3545; color:white; border:none; padding:2px 5px; font-size:11px; border-radius:3px; cursor:pointer;">삭제</button>
            </div>`;
        ul.appendChild(li);
    });
    noticeListArea.appendChild(ul);
}

if (noticeForm) {
    noticeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/notice', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            title:document.getElementById('noticeTitle').value, content:document.getElementById('noticeContent').value
        })}); 
        alert('등록됨'); 
        document.getElementById('noticeTitle').value=''; document.getElementById('noticeContent').value='';
        loadAdminNotices();
    });
}

window.deleteNotice = async (id) => {
    if(confirm('삭제하시겠습니까?')) { await fetch(`/admin/notice/${id}`, {method:'DELETE'}); loadAdminNotices(); }
};


// 4-2. 일정 관리
async function loadAdminSchedules() {
    const res = await fetch('/schedules');
    const schedules = await res.json();
    scheduleListArea.innerHTML = '<h4 style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">등록된 일정 목록</h4>';

    const ul = document.createElement('ul');
    ul.style.listStyle = 'none'; ul.style.padding = 0;

    schedules.forEach(s => {
        const li = document.createElement('li');
        li.style.padding = '5px 0'; li.style.borderBottom = '1px solid #eee';
        li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
        
        const dateStr = s.event_date.split('T')[0];
        const safeTitle = s.title.replace(/'/g, "\\'");

        li.innerHTML = `
            <span style="font-size:0.9rem;">${s.title} (${dateStr})</span>
            <div>
                <button onclick="openEditSchedule(${s.id}, '${safeTitle}', '${dateStr}')" style="background:#007BFF; color:white; border:none; padding:2px 5px; font-size:11px; border-radius:3px; margin-right:5px; cursor:pointer;">수정</button>
                <button onclick="deleteSchedule(${s.id})" style="background:#dc3545; color:white; border:none; padding:2px 5px; font-size:11px; border-radius:3px; cursor:pointer;">삭제</button>
            </div>`;
        ul.appendChild(li);
    });
    scheduleListArea.appendChild(ul);
}

if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/schedule', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            title:document.getElementById('schedTitle').value, eventDate:document.getElementById('schedDate').value
        })}); 
        alert('등록됨'); 
        document.getElementById('schedTitle').value=''; document.getElementById('schedDate').value='';
        loadAdminSchedules();
    });
}

window.deleteSchedule = async (id) => {
    if(confirm('삭제하시겠습니까?')) { await fetch(`/admin/schedule/${id}`, {method:'DELETE'}); loadAdminSchedules(); }
};


// =========================================
// [5] 수정 모달 열기 & 업데이트 처리
// =========================================

window.openEditNotice = (id, title, content) => {
    document.getElementById('editNoticeId').value = id;
    document.getElementById('editNoticeTitle').value = title;
    document.getElementById('editNoticeContent').value = content;
    document.getElementById('editNoticeModal').style.display = 'flex';
};

window.openEditSchedule = (id, title, date) => {
    document.getElementById('editScheduleId').value = id;
    document.getElementById('editSchedTitle').value = title;
    document.getElementById('editSchedDate').value = date;
    document.getElementById('editScheduleModal').style.display = 'flex';
};

window.updateNotice = async () => {
    const id = document.getElementById('editNoticeId').value;
    const title = document.getElementById('editNoticeTitle').value;
    const content = document.getElementById('editNoticeContent').value;
    await fetch(`/admin/notice/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
    });
    alert('수정되었습니다.');
    document.getElementById('editNoticeModal').style.display = 'none';
    loadAdminNotices();
};

window.updateSchedule = async () => {
    const id = document.getElementById('editScheduleId').value;
    const title = document.getElementById('editSchedTitle').value;
    const eventDate = document.getElementById('editSchedDate').value;
    await fetch(`/admin/schedule/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, eventDate })
    });
    alert('수정되었습니다.');
    document.getElementById('editScheduleModal').style.display = 'none';
    loadAdminSchedules();
};


// =========================================
// [6] 초기 로드 실행
// =========================================
loadSettings();
loadPending();
loadAdminRentals();
loadLogs();
loadAdminNotices();
loadAdminSchedules();