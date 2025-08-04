const API_CONFIG = {
    BASE_URL: 'https://dev.unear.site/api/admin',
    ENDPOINTS: {
        EVENT_INFO: '/events',
        PARTNERS_SEARCH: '/events/2/partners/nearby', // 반경 내 제휴처 검색
        EVENT_PARTNERS: '/events' // 이벤트 제휴처 등록 (/{eventId}/partners)
    }
};

// 전역 상태
let eventData = null;
let allPartners = [];
let filteredPartners = [];
let selectedPartners = new Set();
let isLoading = false;
let isRegistering = false; // 등록 중 상태 추가

// URL에서 eventId 추출
const getEventIdFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    let eventId = urlParams.get('eventId');
    
    if (!eventId) {
        eventId = sessionStorage.getItem('selectedEventId');
    }
    
    if (!eventId) {
        eventId = localStorage.getItem('currentEventId');
    }
    
    if (!eventId && window.location.hash) {
        const hashMatch = window.location.hash.match(/eventId=(\d+)/);
        if (hashMatch) {
            eventId = hashMatch[1];
        }
    }
    
    if (!eventId && window.history.state && window.history.state.eventId) {
        eventId = window.history.state.eventId;
    }
    
    if (eventId) {
        eventId = String(eventId).trim();
        if (!/^\d+$/.test(eventId)) {
            eventId = null;
        }
    }
    
    if (!eventId) {
        const confirmUseDefault = confirm(
            'eventId를 찾을 수 없습니다.\n이벤트 목록 페이지로 돌아가시겠습니까?'
        );
        
        if (confirmUseDefault) {
            window.location.href = './events.html';
            return null;
        }
        
        eventId = prompt('이벤트 ID를 입력해주세요:');
        if (!eventId || !/^\d+$/.test(eventId.trim())) {
            alert('올바른 이벤트 ID를 입력해주세요.');
            window.location.href = './events.html';
            return null;
        }
        eventId = eventId.trim();
    }
    
    // 현재 eventId를 저장
    sessionStorage.setItem('selectedEventId', eventId);
    localStorage.setItem('currentEventId', eventId);
    
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('eventId', eventId);
    window.history.replaceState({ eventId: eventId }, '', currentUrl);
    
    return eventId;
};

// 이벤트 정보 로드
const loadEventInfo = async (eventId) => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_INFO}/${eventId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`이벤트 정보를 가져올 수 없습니다. (${response.status})`);
        }

        const result = await response.json();
        
        eventData = {
            eventId: eventId,
            eventName: result?.eventName || result?.data?.eventName || result?.name || `이벤트 ${eventId}`,
            latitude: result?.latitude || result?.data?.latitude,
            longitude: result?.longitude || result?.data?.longitude,
            radiusMeter: result?.radiusMeter || result?.data?.radiusMeter || 1000
        };

        if (!eventData.latitude || !eventData.longitude) {
            throw new Error('이벤트의 위치 정보가 없습니다.');
        }

        return true;
    } catch (error) {
        console.error('이벤트 정보 로드 오류:', error);
        showMessage(error.message, 'error');
        return false;
    }
};

// 반경 내 제휴처 검색 - API 엔드포인트 수정
const searchPartnersInRadius = async () => {
    if (!eventData) return;

    setLoading(true);
    
    try {
        const searchParams = new URLSearchParams({
            latitude: eventData.latitude,
            longitude: eventData.longitude,
            radiusMeter: eventData.radiusMeter
        });

        // eventId를 포함한 올바른 엔드포인트 사용
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_PARTNERS}/${eventData.eventId}/partners/nearby?${searchParams}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`제휴처 검색 실패 (${response.status})`);
        }

        const result = await response.json();
        
        // 응답 구조에 따라 데이터 추출
        allPartners = result?.data || result?.partners || result || [];
        
        // 거리 계산 및 정렬
        allPartners = allPartners.map(partner => ({
            ...partner,
            distance: calculateDistance(
                eventData.latitude,
                eventData.longitude,
                partner.latitude,
                partner.longitude
            )
        })).sort((a, b) => a.distance - b.distance);

        filteredPartners = [...allPartners];
        displayPartners();
        updateStats();
        
        if (allPartners.length === 0) {
            showMessage(`반경 ${eventData.radiusMeter}m 내에 제휴처가 없습니다.`, 'info');
        } else {
            showMessage(`반경 내 ${allPartners.length}개의 제휴처를 찾았습니다.`, 'success');
        }

    } catch (error) {
        console.error('제휴처 검색 오류:', error);
        showMessage(error.message, 'error');
        displayEmptyState('검색 중 오류가 발생했습니다.');
    } finally {
        setLoading(false);
    }
};

// 거리 계산 (하버사인 공식)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
};

// 제휴처 목록 표시
const displayPartners = () => {
    const partnersList = document.getElementById('partnersList');
    
    if (filteredPartners.length === 0) {
        displayEmptyState('조건에 맞는 제휴처가 없습니다.');
        return;
    }

    partnersList.innerHTML = filteredPartners.map(partner => {
        const isSelected = selectedPartners.has(partner.id);
        const categoryText = getCategoryText(partner.categoryCode);
        
        return `
            <div class="partner-item ${isSelected ? 'selected' : ''}" data-partner-id="${partner.id}">
                <input type="checkbox" class="partner-checkbox" ${isSelected ? 'checked' : ''} onchange="event.stopPropagation(); handlePartnerToggle(${partner.id})">
                <div class="partner-info" onclick="handlePartnerToggle(${partner.id})" style="cursor: pointer; flex-grow: 1;">
                    <div class="partner-name">${partner.placeName || partner.name || '이름 없음'}</div>
                    <div class="partner-details">
                        <span class="partner-category">${categoryText}</span>
                        <span class="partner-distance">${partner.distance}m</span>
                        <span>${partner.address || '주소 정보 없음'}</span>
                        ${partner.tel ? `<span>📞 ${partner.tel}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// 빈 상태 표시
const displayEmptyState = (message) => {
    const partnersList = document.getElementById('partnersList');
    partnersList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🏢</div>
            <div>${message}</div>
        </div>
    `;
};

// 카테고리 텍스트 변환
const getCategoryText = (categoryCode) => {
    const categoryMap = {
        'FOOD': '푸드',
        'LIFE': '생활/편의',
        'BEAUTY': '뷰티/건강',
        'ACTIVITY': '액티비티',
        'EDUCATION': '교육',
        'CULTURE': '문화/여가',
        'BAKERY': '베이커리',
        'SHOPPING': '쇼핑',
        'CAFE': '카페'
    };
    return categoryMap[categoryCode] || categoryCode || '기타';
};

// 제휴처 선택/해제 핸들러 (중복 호출 방지)
const handlePartnerToggle = (partnerId) => {
    // 등록 중일 때는 선택 변경 불가
    if (isRegistering) {
        return;
    }
    
    togglePartner(partnerId);
};

// 제휴처 선택/해제 토글
const togglePartner = (partnerId) => {
    if (selectedPartners.has(partnerId)) {
        selectedPartners.delete(partnerId);
    } else {
        selectedPartners.add(partnerId);
    }
    
    updatePartnerSelection(partnerId);
    updateSelectedList();
    updateStats();
};

// 개별 제휴처 선택 상태 업데이트
const updatePartnerSelection = (partnerId) => {
    const partnerItem = document.querySelector(`[data-partner-id="${partnerId}"]`);
    const checkbox = partnerItem?.querySelector('.partner-checkbox');
    
    if (partnerItem && checkbox) {
        const isSelected = selectedPartners.has(partnerId);
        partnerItem.classList.toggle('selected', isSelected);
        checkbox.checked = isSelected;
    }
};

// 선택된 제휴처 목록 업데이트
const updateSelectedList = () => {
    const selectedList = document.getElementById('selectedList');
    const registerBtn = document.getElementById('registerBtn');
    
    if (!selectedList) {
        console.warn('selectedList 엘리먼트를 찾을 수 없습니다.');
        return;
    }

    if (selectedPartners.size === 0) {
        selectedList.innerHTML = `
            <div class="empty-state" style="padding: 30px 10px;">
                <div class="empty-icon">📝</div>
                <div>선택된 제휴처가 없습니다</div>
            </div>
        `;
        if (registerBtn) registerBtn.disabled = true;
    } else {
        const selectedItems = Array.from(selectedPartners).map(partnerId => {
            const partner = allPartners.find(p => p.id === partnerId);
            if (!partner) return '';
            
            return `
                <div class="selected-item">
                    <div class="selected-info">
                        <div class="selected-name">${partner.placeName || partner.name || '이름 없음'}</div>
                        <div class="selected-category">${getCategoryText(partner.categoryCode)} • ${partner.distance}m</div>
                    </div>
                    <button class="remove-btn" onclick="handleRemovePartner(${partner.id})" title="제거" ${isRegistering ? 'disabled' : ''}>
                        ×
                    </button>
                </div>
            `;
        }).filter(item => item !== '').join('');
        
        selectedList.innerHTML = selectedItems;
        if (registerBtn) registerBtn.disabled = isRegistering;
    }
};

// 개별 제휴처 제거 핸들러 (중복 호출 방지)
const handleRemovePartner = (partnerId) => {
    // 등록 중일 때는 제거 불가
    if (isRegistering) {
        return;
    }
    
    removePartner(partnerId);
};

// 개별 제휴처 제거
const removePartner = (partnerId) => {
    selectedPartners.delete(partnerId);
    updatePartnerSelection(partnerId);
    updateSelectedList();
    updateStats();
};

// 통계 업데이트
const updateStats = () => {
    const totalCountEl = document.getElementById('totalCount');
    const selectedCountEl = document.getElementById('selectedCount');
    
    if (totalCountEl) totalCountEl.textContent = filteredPartners.length;
    if (selectedCountEl) selectedCountEl.textContent = selectedPartners.size;
};

// 전체 선택 해제
const clearAllSelections = () => {
    // 등록 중일 때는 선택 변경 불가
    if (isRegistering) {
        return;
    }
    
    selectedPartners.clear();
    document.querySelectorAll('.partner-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.partner-checkbox');
        if (checkbox) checkbox.checked = false;
    });
    updateSelectedList();
    updateStats();
};

// 전체 선택
const selectAllPartners = () => {
    // 등록 중일 때는 선택 변경 불가
    if (isRegistering) {
        return;
    }
    
    filteredPartners.forEach(partner => {
        selectedPartners.add(partner.id);
    });
    
    document.querySelectorAll('.partner-item').forEach(item => {
        const partnerId = parseInt(item.getAttribute('data-partner-id'));
        if (selectedPartners.has(partnerId)) {
            item.classList.add('selected');
            const checkbox = item.querySelector('.partner-checkbox');
            if (checkbox) checkbox.checked = true;
        }
    });
    
    updateSelectedList();
    updateStats();
};

// 검색 및 필터링
const applyFilters = () => {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (!searchInput || !categoryFilter) {
        console.warn('검색 또는 필터 엘리먼트를 찾을 수 없습니다.');
        return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter_value = categoryFilter.value;
    
    filteredPartners = allPartners.filter(partner => {
        const matchesSearch = !searchTerm || 
            (partner.placeName && partner.placeName.toLowerCase().includes(searchTerm)) ||
            (partner.name && partner.name.toLowerCase().includes(searchTerm)) ||
            (partner.address && partner.address.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !categoryFilter_value || partner.categoryCode === categoryFilter_value;
        
        return matchesSearch && matchesCategory;
    });
    
    displayPartners();
    updateStats();
};

// 제휴처 등록 (중복 호출 방지 개선)
const registerPartners = async () => {
    // 이미 등록 중이면 무시
    if (isRegistering) {
        console.warn('이미 등록 중입니다.');
        return;
    }

    if (selectedPartners.size === 0) {
        alert('등록할 제휴처를 선택해주세요.');
        return;
    }

    const confirmMessage = `선택한 ${selectedPartners.size}개의 제휴처를 이벤트에 등록하시겠습니까?`;
    if (!confirm(confirmMessage)) {
        return;
    }

    // 등록 중 상태로 설정
    isRegistering = true;
    setRegisterLoading(true);

    try {
        const partnerStoreIds = Array.from(selectedPartners);
        const requestData = {
            partnerStoreIds: partnerStoreIds
        };

        console.log('제휴처 등록 요청:', requestData);

        // AbortController로 중복 요청 방지
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_PARTNERS}/${eventData.eventId}/partners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            credentials: 'include',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('응답 상태:', response.status);

        if (response.ok) {
            let result = null;

            try {
                const text = await response.text();
                if (text) {
                    result = JSON.parse(text);
                    console.log('등록 성공:', result);
                } else {
                    console.log('등록 성공: 응답 본문 없음');
                }
            } catch (err) {
                console.warn('JSON 파싱 실패:', err);
            }
            
            showMessage(`${selectedPartners.size}개의 제휴처가 성공적으로 등록되었습니다!`, 'success');
            
            // 성공 후 선택 초기화
            clearAllSelections();
            
            // 성공 후 처리
            setTimeout(() => {
                const nextStep = confirm('제휴처 등록이 완료되었습니다.\n\n다른 작업을 계속하시겠습니까?');
                if (nextStep) {
                    // 이벤트 쿠폰 페이지로 리다이렉션
                    const eventId = eventData.eventId;
                    if (eventId) {
                        window.location.href = `./event_coupon.html?eventId=${eventId}`;
                    } else {
                        console.error('eventData.eventId가 없습니다:', eventData);
                        alert('이벤트 ID 오류가 발생했습니다.');
                        goBack();
                    }
                } else {
                    goBack(); // 이벤트 목록으로
                }
            }, 2000);
            
        } else {
            let errorMessage = '등록 중 오류가 발생했습니다.';
            
            try {
                const errorResult = await response.json();
                errorMessage = errorResult.message || errorMessage;
            } catch (e) {
                // JSON 파싱 실패 시 기본 메시지 사용
                if (response.status === 400) {
                    errorMessage = '잘못된 요청입니다. 선택한 제휴처를 확인해주세요.';
                } else if (response.status === 404) {
                    errorMessage = '이벤트를 찾을 수 없습니다.';
                } else if (response.status === 409) {
                    errorMessage = '이미 등록된 제휴처가 포함되어 있습니다.';
                }
            }
            
            console.error('등록 실패:', response.status, errorMessage);
            alert(errorMessage);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('요청 타임아웃');
            alert('요청 시간이 초과되었습니다. 다시 시도해주세요.');
        } else {
            console.error('제휴처 등록 오류:', error);
            alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    } finally {
        // 등록 상태 해제
        isRegistering = false;
        setRegisterLoading(false);
    }
};

// 로딩 상태 관리
const setLoading = (loading) => {
    isLoading = loading;
    const partnersList = document.getElementById('partnersList');
    
    if (!partnersList) {
        console.warn('partnersList 엘리먼트를 찾을 수 없습니다.');
        return;
    }
    
    if (loading) {
        partnersList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div>반경 내 제휴처를 검색하고 있습니다...</div>
            </div>
        `;
    }
};

// 등록 버튼 로딩 상태
const setRegisterLoading = (loading) => {
    const registerBtn = document.getElementById('registerBtn');
    if (!registerBtn) {
        console.warn('registerBtn 엘리먼트를 찾을 수 없습니다.');
        return;
    }
    
    if (loading) {
        registerBtn.disabled = true;
        registerBtn.innerHTML = `
            <div class="spinner"></div>
            <span>등록 중...</span>
        `;
    } else {
        registerBtn.disabled = selectedPartners.size === 0 || isRegistering;
        registerBtn.innerHTML = `<span class="btn-text">제휴처 등록</span>`;
    }
};

// 메시지 표시
const showMessage = (message, type = 'info') => {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        console.warn('messageContainer 엘리먼트를 찾을 수 없습니다. 콘솔로 메시지 출력:', message);
        return;
    }
    
    const className = type === 'error' ? 'error-message' : 
                     type === 'success' ? 'success-message' : 'info-message';
    
    messageContainer.innerHTML = `
        <div class="${className}">
            ${message}
        </div>
    `;
    
    // 3초 후 메시지 제거
    setTimeout(() => {
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    }, 3000);
};

// 뒤로가기
const goBack = () => {
    window.location.href = './events.html';
};

// 디바운스 함수
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 이벤트 리스너 등록 (중복 등록 방지)
const setupEventListeners = () => {
    // 기존 이벤트 리스너 제거
    const removeExistingListeners = () => {
        const elements = [
            'searchInput', 'categoryFilter', 'selectAllBtn', 
            'clearAllBtn', 'registerBtn', 'backBtn'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                // 기존 이벤트 리스너를 완전히 제거하기 위해 클론으로 교체
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
            }
        });
    };

    removeExistingListeners();

    // 검색 입력 - 디바운스 적용
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    
    // 카테고리 필터
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }

    // 전체 선택 버튼
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllPartners);
    }

    // 전체 해제 버튼
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllSelections);
    }

    // 등록 버튼
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerPartners);
    }

    // 뒤로가기 버튼
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
};

// 페이지 초기화
const initializePage = async () => {
    console.log('페이지 초기화 시작...');
    
    // URL에서 eventId 가져오기
    const eventId = getEventIdFromUrl();
    if (!eventId) {
        console.error('eventId를 가져올 수 없어 초기화를 중단합니다.');
        return;
    }

    // 이벤트 정보 표시 (로딩 중)
    const eventInfo = document.getElementById('eventInfo');
    if (eventInfo) {
        eventInfo.innerHTML = `
            <div class="event-icon">⏳</div>
            <div>
                <div>이벤트 정보 로딩 중...</div>
                <div style="font-size: 12px; opacity: 0.8;">eventId: ${eventId}</div>
            </div>
        `;
    }

    // 이벤트 정보 로드
    const success = await loadEventInfo(eventId);
    if (!success) {
        console.error('이벤트 정보 로드 실패');
        if (eventInfo) {
            eventInfo.innerHTML = `
                <div class="event-icon">❌</div>
                <div>
                    <div style="color: #e74c3c;">이벤트 정보 로드 실패</div>
                    <div style="font-size: 12px; opacity: 0.8;">eventId: ${eventId}</div>
                </div>
            `;
        }
        
        setTimeout(() => {
            if (confirm('이벤트 목록 페이지로 돌아가시겠습니까?')) {
                goBack();
            }
        }, 3000);
        return;
    }

    // 이벤트 정보 표시
    if (eventInfo) {
        eventInfo.innerHTML = `
            <div class="event-icon">🎉</div>
            <div>
                <div>${eventData.eventName}</div>
                <div style="font-size: 12px; opacity: 0.8;">
                    반경 ${eventData.radiusMeter.toLocaleString()}m • 
                    중심: ${eventData.latitude.toFixed(4)}, ${eventData.longitude.toFixed(4)}
                </div>
            </div>
        `;
    }

    // 이벤트 리스너 설정
    setupEventListeners();

    // 제휴처 검색 시작
    await searchPartnersInRadius();
    
    console.log('페이지 초기화 완료');
};

// 전역 함수로 노출 (HTML에서 직접 호출하는 함수들) - 중복 호출 방지 버전
window.handlePartnerToggle = handlePartnerToggle;
window.handleRemovePartner = handleRemovePartner;
window.togglePartner = togglePartner;
window.removePartner = removePartner;
window.clearAllSelections = clearAllSelections;
window.selectAllPartners = selectAllPartners;
window.registerPartners = registerPartners;
window.goBack = goBack;

// 페이지 로드 시 초기화 (중복 초기화 방지)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}