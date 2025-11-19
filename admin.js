// admin.js

// [보안] 관리자가 아니면 메인으로 쫓아냄
const userId = localStorage.getItem('userId');
if (userId !== 'admin') {
    alert('관리자 권한이 없습니다.');
    window.location.href = '/';
}

// 요소 선택
const settingsForm = document.getElementById('settingsForm');
const bannerFile = document.getElementById('bannerFile');
const pendingList = document.getElementById('pendingList');
const currentRentals = document.getElementById('currentRentals'); // 대여 현황 박스
const logList = document.getElementById('logList');
const adminRentalList = document.getElementById('adminRentalList'); // 물품 관리 리스트

// =========================================
// 1. 설정값 불러오기
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
        }
    } catch (err) { console.error('설정 로드 실패:', err); }
}

// 설정 저장
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

// 배너 관리
window.uploadBanner = async () => {
    const file = bannerFile.files[0];
    if (!file) return alert('파일을 선택해주세요.');
    const formData = new FormData();
    formData.append('bannerFile', file);
    await fetch('/admin/banner', { method: 'POST', body: formData });
    alert('배너가 적용되었습니다.');
};

window.deleteBanner = async () => {
    if(confirm('배너를 삭제하시겠습니까?')) { 
        await fetch('/admin/banner', { method: 'DELETE' }); 
        alert('삭제되었습니다.'); 
    }
};


// =========================================
// 2. ★ 대여 현황 불러오기 (오류 수정됨)
// =========================================
async function loadAdminRentals() {
    // 로딩 중 메시지가 계속 떠있지 않게 try-catch로 감쌈
    try {
        const res = await fetch('/rentals');
        const items = await res.json();
        
        // 1. 대여 현황 표시 (currentRentals)
        if (!currentRentals) return; // HTML에 박스가 없으면 중단
        currentRentals.innerHTML = '';
        
        if(items.length === 0) { 
            currentRentals.innerHTML = '<p style="color:#666;">등록된 물품이 없습니다.</p>'; 
        } else {
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = 0;

            items.forEach(item => {
                const li = document.createElement('li');
                li.style.padding = '10px'; 
                li.style.borderBottom = '1px solid #eee';
                li.style.background = 'white';
                li.style.marginBottom = '5px';
                li.style.borderRadius = '5px';
                
                let html = `<div><strong>${item.item_name}</strong>`;

                if (item.is_rented === 1) {
                    // 대여중일 때
                    html += ` <span style="color:red; font-weight:bold;">[대여중]</span>`;
                    
                    // 대여 정보 (이름, 학번, 폰)
                    html += `<div style="font-size:0.9rem; color:#555; margin-top:5px; background:#f9f9f9; padding:5px;">
                                👤 ${item.renter_name || '이름없음'} (${item.renter_student_id || '학번없음'})<br>
                                📞 ${item.renter_phone || '번호없음'}<br>`;
                    
                    // 시간 계산 (에러 방지: rented_at이 있을 때만 계산)
                    if (item.rented_at) {
                        const rentDate = new Date(item.rented_at);
                        const now = new Date();
                        const diffMs = now - rentDate;
                        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        html += `⏱️ ${diffHrs}시간 ${diffMins}분 전 대여`;
                    } else {
                        html += `⏱️ 시간 정보 없음`;
                    }
                    html += `</div>`;
                } else {
                    // 대여 가능일 때
                    html += ` <span style="color:green; font-weight:bold;">[대여가능]</span>`;
                }
                html += `</div>`; // 닫는 div
                
                li.innerHTML = html;
                ul.appendChild(li);
            });
            currentRentals.appendChild(ul);
        }

        // 2. 물품 관리 목록 (삭제용 - adminRentalList)
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

    } catch (err) { 
        console.error(err);
        if (currentRentals) currentRentals.innerHTML = '<p style="color:red;">데이터를 불러오는데 실패했습니다.</p>'; 
    }
}


// =========================================
// 3. 반납 기록(Logs) 보기
// =========================================
async function loadLogs() {
    try {
        const res = await fetch('/admin/rental-logs');
        const logs = await res.json();
        if (!logList) return;
        logList.innerHTML = '';

        if (logs.length === 0) {
            logList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">반납 기록이 없습니다.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const rentTime = new Date(log.rented_at);
            const returnTime = new Date(log.returned_at);
            
            // 기간 계산
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
                <td>${log.return_image ? `<a href="${log.return_image}" target="_blank" class="photo-btn" style="text-decoration:none; background:#17a2b8; color:white; padding:3px 8px; border-radius:3px; font-size:12px;">사진보기</a>` : '없음'}</td>
            `;
            logList.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}


// =========================================
// 4. 기타 관리자 기능들 (승인, 공지, 물품추가)
// =========================================

// 승인 대기 목록
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

// 각 버튼 기능들
window.approve = async (u) => { 
    if(confirm('승인하시겠습니까?')) {
        await fetch('/admin/approve', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})}); 
        loadPending(); 
    }
};

// 공지 등록
const noticeForm = document.getElementById('noticeForm');
if (noticeForm) {
    noticeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/notice', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            title:document.getElementById('noticeTitle').value, content:document.getElementById('noticeContent').value
        })}); 
        alert('공지가 등록되었습니다.'); 
        document.getElementById('noticeTitle').value=''; 
        document.getElementById('noticeContent').value='';
    });
}

// 일정 등록
const scheduleForm = document.getElementById('scheduleForm');
if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/schedule', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            title:document.getElementById('schedTitle').value, eventDate:document.getElementById('schedDate').value
        })}); 
        alert('일정이 추가되었습니다.');
        document.getElementById('schedTitle').value='';
        document.getElementById('schedDate').value='';
    });
}

// 물품 추가
const addRentalForm = document.getElementById('addRentalForm');
if (addRentalForm) {
    addRentalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/admin/rental-item', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            itemName:document.getElementById('newItemName').value
        })}); 
        alert('물품이 추가되었습니다.'); 
        document.getElementById('newItemName').value=''; 
        loadAdminRentals();
    });
}

// 물품 삭제
window.deleteRentalItem = async (id) => { 
    if(confirm('정말 삭제하시겠습니까?')) { 
        await fetch(`/admin/rental-item/${id}`, {method:'DELETE'}); 
        loadAdminRentals(); 
    } 
};


// =========================================
// [5] 초기 실행
// =========================================
loadSettings();
loadAdminRentals(); // 이게 '대여 현황'과 '물품 관리 목록'을 모두 채워줍니다.
loadLogs();
loadPending();