const API_CONFIG = {
    BASE_URL: 'https://dev.unear.site/api/admin',
    ENDPOINTS: {
        EVENT_INFO: '/events',
        COUPON_CREATE: '/events', // /{eventId}/coupon
        DISCOUNT_POLICIES: '/discount-policies',
        MEMBERSHIPS: '/memberships',
        EVENT_PLACES: '/events' // /{eventId}/places - 팝업스토어 목록 조회
    }
};

// 전역 상태
let eventData = null;
let discountPolicies = [];
let membershipLevels = [];
let popupStores = []; // 팝업스토어 목록
let isSubmitting = false;

// URL에서 eventId 추출 (제휴처 페이지와 동일한 로직)
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

// 이벤트 정보 로드 (상세 정보 포함)
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
        
        // 응답 구조에 따라 데이터 추출
        const extractData = (response, field) => {
            const possiblePaths = [
                response?.[field],
                response?.data?.[field],
                response?.result?.[field]
            ];
            
            for (const path of possiblePaths) {
                if (path !== undefined && path !== null) {
                    return path;
                }
            }
            return null;
        };
        
        eventData = {
            eventId: eventId,
            eventName: extractData(result, 'eventName') || 
                     extractData(result, 'name') || 
                     `이벤트 ${eventId}`,
            eventDescription: extractData(result, 'description') || 
                            extractData(result, 'eventDescription') || '',
            eventStatus: extractData(result, 'status') || 
                        extractData(result, 'eventStatus') || 'ACTIVE',
            // 위치 정보
            latitude: extractData(result, 'latitude'),
            longitude: extractData(result, 'longitude'),
            address: extractData(result, 'address') || 
                    extractData(result, 'eventAddress') || '',
            radiusMeter: extractData(result, 'radiusMeter') || 1000,
            // 날짜 정보  
            startDate: extractData(result, 'startDate') || 
                      extractData(result, 'eventStartDate'),
            endDate: extractData(result, 'endDate') || 
                    extractData(result, 'eventEndDate'),
            // 운영 시간
            openTime: extractData(result, 'openTime'),
            closeTime: extractData(result, 'closeTime')
        };

        console.log('로드된 이벤트 정보:', eventData);
        return true;
    } catch (error) {
        console.error('이벤트 정보 로드 오류:', error);
        showError(error.message);
        return false;
    }
};

// 팝업스토어 목록 로드
const loadPopupStores = async (eventId) => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_PLACES}/${eventId}/places`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            // 팝업스토어만 필터링 (markerCode가 'POPUP'인 것들)
            const allPlaces = result?.data || result?.places || result || [];
            popupStores = allPlaces.filter(place => 
                place.markerCode === 'POPUP' || 
                place.type === 'POPUP' ||
                place.placeType === 'POPUP'
            );
            
            console.log('로드된 팝업스토어:', popupStores);
            populatePopupStores();
        } else {
            console.warn('팝업스토어 목록 로드 실패');
            popupStores = [];
            populatePopupStores();
        }
    } catch (error) {
        console.error('팝업스토어 로드 오류:', error);
        popupStores = [];
        populatePopupStores();
    }
};

// 할인 정책 목록 로드 - 직접 입력 방식으로 변경
const loadDiscountPolicies = async () => {
    // 선착순 쿠폰은 할인 정책을 직접 입력받는 방식으로 변경
    // discountCode는 항상 COUPON_FCFS로 고정
    console.log('선착순 쿠폰은 할인 정책을 직접 설정합니다.');
    
    // 할인 정책 UI 초기화
    initializeDiscountInputs();
};

// 할인 정책 직접 입력 UI 초기화
const initializeDiscountInputs = () => {
    // 할인 타입 선택 기본값 설정 (퍼센트)
    const discountTypeSelect = document.getElementById('discountType');
    if (discountTypeSelect) {
        discountTypeSelect.value = 'PERCENTAGE';
        handleDiscountTypeChange();
    }
    
    // 기본 할인율 10% 설정
    const discountValueInput = document.getElementById('discountValue');
    if (discountValueInput) {
        discountValueInput.value = 10;
    }
    
    updatePreview();
};

// 할인 타입 변경 처리
const handleDiscountTypeChange = () => {
    const discountType = document.getElementById('discountType').value;
    const discountValueInput = document.getElementById('discountValue');
    const unitSpan = document.getElementById('discountUnit');
    
    if (discountType === 'PERCENTAGE') {
        if (discountValueInput) {
            discountValueInput.max = 100;
            discountValueInput.min = 1;
            discountValueInput.step = 1;
            discountValueInput.placeholder = '10';
            if (!discountValueInput.value || parseInt(discountValueInput.value) > 100) {
                discountValueInput.value = 10;
            }
        }
        if (unitSpan) unitSpan.textContent = '%';
    } else if (discountType === 'AMOUNT') {
        if (discountValueInput) {
            discountValueInput.max = 100000;
            discountValueInput.min = 100;
            discountValueInput.step = 100;
            discountValueInput.placeholder = '5000';
            if (!discountValueInput.value || parseInt(discountValueInput.value) < 100) {
                discountValueInput.value = 5000;
            }
        }
        if (unitSpan) unitSpan.textContent = '원';
    }
    
    updatePreview();
};

// 회원 등급 목록 로드
const loadMembershipLevels = async () => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MEMBERSHIPS}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            membershipLevels = result?.data || result || [];
            populateMembershipLevels();
        } else {
            console.warn('회원 등급 로드 실패, 기본값 사용');
            membershipLevels = [
                { code: 'BRONZE', name: '브론즈' },
                { code: 'SILVER', name: '실버' },
                { code: 'GOLD', name: '골드' },
                { code: 'PLATINUM', name: '플래티넘' }
            ];
            populateMembershipLevels();
        }
    } catch (error) {
        console.error('회원 등급 로드 오류:', error);
        // 기본값 사용
        membershipLevels = [
            { code: 'BRONZE', name: '브론즈' },
            { code: 'SILVER', name: '실버' },
            { code: 'GOLD', name: '골드' },
            { code: 'PLATINUM', name: '플래티넘' }
        ];
        populateMembershipLevels();
    }
};

// 회원 등급 옵션 채우기
const populateMembershipLevels = () => {
    const select = document.getElementById('membershipCode');
    if (!select) return;

    select.innerHTML = '<option value="">전체 회원 대상</option>';
    
    membershipLevels.forEach(level => {
        const option = document.createElement('option');
        option.value = level.code;
        option.textContent = level.name + ' 이상';
        select.appendChild(option);
    });
};

// 팝업스토어 목록 채우기
const populatePopupStores = () => {
    const select = document.getElementById('popupStoreLocation');
    if (!select) return;

    select.innerHTML = '<option value="">팝업스토어 위치를 선택해주세요</option>';
    
    if (popupStores.length === 0) {
        // 팝업스토어가 없으면 직접 입력 옵션만 제공
        const option = document.createElement('option');
        option.value = 'custom';
        option.textContent = '직접 입력';
        select.appendChild(option);
    } else {
        // 등록된 팝업스토어 목록 추가
        popupStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id || store.placeId;
            option.textContent = store.placeName || store.name || '이름 없는 팝업스토어';
            option.setAttribute('data-address', store.address || '');
            option.setAttribute('data-latitude', store.latitude || '');
            option.setAttribute('data-longitude', store.longitude || '');
            select.appendChild(option);
        });
        
        // 직접 입력 옵션도 추가
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = '직접 입력';
        select.appendChild(customOption);
    }
    
    // 첫 번째 팝업스토어를 기본값으로 선택 (있다면)
    if (popupStores.length > 0) {
        select.selectedIndex = 1; // 첫 번째 팝업스토어 선택
        handlePopupStoreChange();
    }
};

// 팝업스토어 선택 변경 처리
const handlePopupStoreChange = () => {
    const select = document.getElementById('popupStoreLocation');
    const customInput = document.getElementById('customLocationInput');
    const customLocationText = document.getElementById('customLocation');
    
    if (!select) return;
    
    const selectedValue = select.value;
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedValue === 'custom') {
        // 직접 입력 모드
        if (customInput) customInput.style.display = 'block';
        if (customLocationText) customLocationText.value = '';
    } else if (selectedValue) {
        // 기존 팝업스토어 선택
        if (customInput) customInput.style.display = 'none';
        if (customLocationText) {
            const address = selectedOption.getAttribute('data-address') || '';
            const latitude = selectedOption.getAttribute('data-latitude') || '';
            const longitude = selectedOption.getAttribute('data-longitude') || '';
            
            let locationInfo = selectedOption.textContent;
            if (address) locationInfo += ` (${address})`;
            if (latitude && longitude) {
                locationInfo += ` [${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}]`;
            }
            
            customLocationText.value = locationInfo;
        }
    } else {
        // 선택 안함
        if (customInput) customInput.style.display = 'none';
        if (customLocationText) customLocationText.value = '';
    }
    
    updatePreview();
};

// 이벤트 정보 UI 업데이트 (상세 정보 포함)
const updateEventInfoUI = () => {
    const eventInfoElement = document.getElementById('eventInfo');
    if (eventInfoElement && eventData) {
        let locationInfo = '';
        if (eventData.address) {
            locationInfo += eventData.address;
        }
        if (eventData.latitude && eventData.longitude) {
            locationInfo += ` (${Number(eventData.latitude).toFixed(4)}, ${Number(eventData.longitude).toFixed(4)})`;
        }
        if (eventData.radiusMeter) {
            locationInfo += `, 반경 ${eventData.radiusMeter.toLocaleString()}m`;
        }
        
        let dateInfo = '';
        if (eventData.startDate && eventData.endDate) {
            dateInfo = `${eventData.startDate} ~ ${eventData.endDate}`;
        }
        if (eventData.openTime && eventData.closeTime) {
            dateInfo += ` (${eventData.openTime}~${eventData.closeTime})`;
        }
        
        eventInfoElement.innerHTML = `
            <div class="event-icon">🎫</div>
            <div>
                <div style="font-weight: 600; margin-bottom: 4px;">${eventData.eventName}</div>
                ${eventData.eventDescription ? `<div style="font-size: 13px; color: #666; margin-bottom: 4px;">${eventData.eventDescription}</div>` : ''}
                ${locationInfo ? `<div style="font-size: 12px; color: #888;">📍 ${locationInfo}</div>` : ''}
                ${dateInfo ? `<div style="font-size: 12px; color: #888;">🗓️ ${dateInfo}</div>` : ''}
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
                    이벤트 ID: ${eventData.eventId} • 상태: ${eventData.eventStatus}
                </div>
            </div>
        `;
    }
};

// 페이지 제목 업데이트
const updatePageTitle = () => {
    if (eventData) {
        document.title = `${eventData.eventName} - 선착순 쿠폰 생성`;
        
        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
            pageTitle.textContent = `${eventData.eventName} - 선착순 쿠폰 생성`;
        }
    }
};

// 현재 날짜 설정 및 기본값 설정
const initializeDateInputs = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const startInput = document.getElementById('couponStart');
    const endInput = document.getElementById('couponEnd');
    const quantityInput = document.getElementById('remainingQuantity');
    
    // 이벤트 기간이 있으면 해당 기간으로 설정
    if (eventData && eventData.startDate && eventData.endDate) {
        if (startInput) startInput.value = eventData.startDate;
        if (endInput) endInput.value = eventData.endDate;
    } else {
        if (startInput) startInput.value = today;
        if (endInput) endInput.value = nextWeek.toISOString().split('T')[0];
    }
    
    if (quantityInput) quantityInput.value = 100;
    
    // 기본 쿠폰명 설정
    const couponNameInput = document.getElementById('couponName');
    if (couponNameInput && eventData) {
        couponNameInput.value = `${eventData.eventName} 선착순 쿠폰`;
    }
};

// 실시간 미리보기 업데이트
function updatePreview() {
    const couponName = document.getElementById('couponName').value || '쿠폰명을 입력해주세요';
    const quantity = document.getElementById('remainingQuantity').value || '0';
    const discountType = document.getElementById('discountType')?.value || 'PERCENTAGE';
    const discountValue = document.getElementById('discountValue')?.value || '0';
    const membershipCode = document.getElementById('membershipCode');
    const popupStoreSelect = document.getElementById('popupStoreLocation');
    const customLocation = document.getElementById('customLocation');
    
    // 기본 정보 업데이트
    document.getElementById('previewName').textContent = couponName;
    document.getElementById('previewQuantity').textContent = quantity;
    document.getElementById('previewQuantityText').textContent = quantity + '개 한정';
    
    // 할인 정책 표시 (직접 입력된 값으로)
    let discountText = '할인 정책 설정';
    if (discountValue && parseInt(discountValue) > 0) {
        if (discountType === 'PERCENTAGE') {
            discountText = `선착순 ${discountValue}% 할인`;
        } else if (discountType === 'AMOUNT') {
            discountText = `선착순 ${parseInt(discountValue).toLocaleString()}원 할인`;
        }
    }
    document.getElementById('previewDiscount').textContent = discountText;
    
    // 팝업스토어 위치 표시
    let locationText = '팝업스토어 위치 선택';
    if (popupStoreSelect && popupStoreSelect.value) {
        if (popupStoreSelect.value === 'custom') {
            locationText = customLocation?.value || '직접 입력한 위치';
        } else {
            const selectedOption = popupStoreSelect.options[popupStoreSelect.selectedIndex];
            locationText = selectedOption.textContent || '선택된 팝업스토어';
        }
    }
    document.getElementById('previewPlace').textContent = locationText;
    
    // 회원 등급 표시
    const gradeText = membershipCode.options[membershipCode.selectedIndex]?.text || '전체 회원';
    document.getElementById('previewGrade').textContent = gradeText;
    
    // 사용 가능 일수 계산
    const startDate = new Date(document.getElementById('couponStart').value);
    const endDate = new Date(document.getElementById('couponEnd').value);
    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('previewDays').textContent = diffDays > 0 ? diffDays : 0;
    
    // 선착순 타입 강조 표시
    const previewTypeElement = document.getElementById('previewType');
    if (previewTypeElement) {
        previewTypeElement.textContent = 'FCFS (선착순)';
        previewTypeElement.style.color = '#e74c3c';
        previewTypeElement.style.fontWeight = 'bold';
    }
}

// 수량 조절 함수
function adjustQuantity(change) {
    const input = document.getElementById('remainingQuantity');
    let value = parseInt(input.value) || 0;
    value += change;
    if (value < 1) value = 1;
    if (value > 10000) value = 10000;
    input.value = value;
    updatePreview();
}

// 할인값 조절 함수
function adjustDiscountValue(change) {
    const input = document.getElementById('discountValue');
    const discountType = document.getElementById('discountType').value;
    let value = parseInt(input.value) || 0;
    
    if (discountType === 'PERCENTAGE') {
        value += change;
        if (value < 1) value = 1;
        if (value > 100) value = 100;
    } else if (discountType === 'AMOUNT') {
        value += change * 1000; // 1000원 단위로 조절
        if (value < 100) value = 100;
        if (value > 100000) value = 100000;
    }
    
    input.value = value;
    updatePreview();
}

// 폼 초기화
function resetForm() {
    if (confirm('입력한 내용이 모두 삭제됩니다. 계속하시겠습니까?')) {
        const form = document.getElementById('couponForm');
        form.reset();
        initializeDateInputs();
        initializeDiscountInputs();
        
        if (popupStores.length > 0) {
            const storeSelect = document.getElementById('popupStoreLocation');
            if (storeSelect) {
                storeSelect.selectedIndex = 1;
                handlePopupStoreChange();
            }
        }
        
        updatePreview();
    }
}

// 뒤로가기 (제휴처 페이지로)
function goBack() {
    if (confirm('작성 중인 내용이 있습니다. 페이지를 나가시겠습니까?')) {
        // eventId를 유지하면서 제휴처 페이지로 이동
        const eventId = eventData?.eventId || getEventIdFromUrl();
        if (eventId) {
            window.location.href = `./events_partners.html?eventId=${eventId}`;
        } else {
            window.location.href = './events.html';
        }
    }
}

// 에러 메시지 표시
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(`오류: ${message}`);
    }
}

// 성공 메시지 표시
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        alert(`성공: ${message}`);
    }
}

// 쿠폰 생성 API 호출
const createCoupon = async (couponData) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COUPON_CREATE}/${eventData.eventId}/coupon`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(couponData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `선착순 쿠폰 생성에 실패했습니다. (${response.status})`);
    }

    return response.json().catch(() => ({}));
};

// 폼 제출 처리
const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // 이미 제출 중이면 무시
    if (isSubmitting) {
        return;
    }

    const form = document.getElementById('couponForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');
    
    // 버튼 비활성화 및 로딩 표시
    isSubmitting = true;
    submitBtn.disabled = true;
    if (submitText) submitText.style.display = 'none';
    if (submitSpinner) submitSpinner.style.display = 'inline-block';
    
    try {
        // 팝업스토어 위치 정보 수집
        const popupStoreSelect = document.getElementById('popupStoreLocation');
        const customLocation = document.getElementById('customLocation');
        
        let locationInfo = null;
        if (popupStoreSelect && popupStoreSelect.value) {
            if (popupStoreSelect.value === 'custom') {
                locationInfo = customLocation?.value || null;
            } else {
                const selectedStore = popupStores.find(store => 
                    (store.id || store.placeId) == popupStoreSelect.value
                );
                if (selectedStore) {
                    locationInfo = {
                        placeId: selectedStore.id || selectedStore.placeId,
                        placeName: selectedStore.placeName || selectedStore.name,
                        address: selectedStore.address,
                        latitude: selectedStore.latitude,
                        longitude: selectedStore.longitude
                    };
                }
            }
        }
        
        // 할인 정책 정보 수집
        const discountType = document.getElementById('discountType').value;
        const discountValue = parseInt(document.getElementById('discountValue').value) || 0;
        
        // 폼 데이터 수집 - DB 구조에 맞게 수정
        const couponData = {
            couponName: document.getElementById('couponName').value.trim(),
            remainingQuantity: parseInt(document.getElementById('remainingQuantity').value),
            couponStart: document.getElementById('couponStart').value,
            couponEnd: document.getElementById('couponEnd').value,
            discountCode: 'COUPON_FCFS', // 선착순 쿠폰 고정값
            membershipCode: document.getElementById('membershipCode').value || 'ALL', // 전체 회원은 ALL
            markerCode: 'POPUP', // 팝업스토어 전용 고정값
            
            // 할인 정책 정보 (직접 입력)
            discountType: discountType,
            discountValue: discountValue,
            
            // 팝업스토어 위치 정보
            locationInfo: locationInfo,
            eventId: eventData.eventId
        };

        // 유효성 검사
        if (!couponData.couponName) {
            throw new Error('쿠폰명을 입력해주세요.');
        }
        if (!discountValue || discountValue <= 0) {
            throw new Error('할인 금액 또는 할인율을 입력해주세요.');
        }
        if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 100)) {
            throw new Error('할인율은 1~100% 사이여야 합니다.');
        }
        if (discountType === 'AMOUNT' && (discountValue < 100 || discountValue > 100000)) {
            throw new Error('할인 금액은 100원~100,000원 사이여야 합니다.');
        }
        if (couponData.remainingQuantity < 1 || couponData.remainingQuantity > 10000) {
            throw new Error('발급 수량은 1~10,000개 사이여야 합니다.');
        }

        const startDate = new Date(couponData.couponStart);
        const endDate = new Date(couponData.couponEnd);
        if (endDate <= startDate) {
            throw new Error('종료일은 시작일보다 뒤여야 합니다.');
        }

        // 팝업스토어 위치 검증
        if (!locationInfo) {
            throw new Error('팝업스토어 위치를 선택하거나 입력해주세요.');
        }

        console.log('선착순 쿠폰 생성 요청:', {
            eventId: eventData.eventId,
            couponData: couponData
        });

        // API 호출
        const result = await createCoupon(couponData);
        console.log('선착순 쿠폰 생성 성공:', result);
        
        showSuccess(`선착순 쿠폰 "${couponData.couponName}"이(가) 성공적으로 생성되었습니다!`);
        
        // 성공 후 처리 - 이벤트 관리 페이지로 이동
        setTimeout(() => {
            const nextStep = confirm(
                `선착순 쿠폰이 성공적으로 생성되었습니다!\n\n` +
                `🎫 쿠폰명: ${couponData.couponName}\n` +
                `📊 발급 수량: ${couponData.remainingQuantity}개\n` +
                `💰 할인: ${discountType === 'PERCENTAGE' ? discountValue + '%' : discountValue.toLocaleString() + '원'}\n` +
                `📍 사용 장소: 팝업스토어\n\n` +
                `이벤트 관리 대시보드로 이동하시겠습니까?\n` +
                `(취소 시 이벤트 목록으로 이동합니다)`
            );
            
            if (nextStep) {
                // 이벤트 상세 관리 페이지로 이동 (eventId 유지)
                window.location.href = `./event-detail.html?eventId=${eventData.eventId}`;
            } else {
                // 이벤트 목록 페이지로 이동
                window.location.href = './events.html';
            }
        }, 2000);
        
    } catch (error) {
        console.error('선착순 쿠폰 생성 오류:', error);
        showError(error.message || '선착순 쿠폰 생성 중 오류가 발생했습니다.');
    } finally {
        // 버튼 상태 복원
        isSubmitting = false;
        submitBtn.disabled = false;
        if (submitText) submitText.style.display = 'inline';
        if (submitSpinner) submitSpinner.style.display = 'none';
    }
};

// 이벤트 리스너 설정
const setupEventListeners = () => {
    const form = document.getElementById('couponForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 팝업스토어 선택 이벤트
    const popupStoreSelect = document.getElementById('popupStoreLocation');
    if (popupStoreSelect) {
        popupStoreSelect.addEventListener('change', handlePopupStoreChange);
    }

    // 할인 타입 변경 이벤트
    const discountTypeSelect = document.getElementById('discountType');
    if (discountTypeSelect) {
        discountTypeSelect.addEventListener('change', handleDiscountTypeChange);
    }

    // 실시간 미리보기 이벤트 리스너
    const previewElements = [
        'couponName', 'remainingQuantity', 'discountType', 'discountValue',
        'membershipCode', 'couponStart', 'couponEnd', 'customLocation'
    ];
    
    previewElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            const eventType = element.type === 'select-one' ? 'change' : 'input';
            element.addEventListener(eventType, updatePreview);
        }
    });

    // 날짜 유효성 검사
    const startDateInput = document.getElementById('couponStart');
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            const startDate = this.value;
            const endDateInput = document.getElementById('couponEnd');
            if (endDateInput) {
                endDateInput.min = startDate;
                
                if (endDateInput.value && endDateInput.value <= startDate) {
                    const nextDay = new Date(startDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    endDateInput.value = nextDay.toISOString().split('T')[0];
                }
            }
            updatePreview();
        });
    }

    // 수량 입력 유효성 검사
    const quantityInput = document.getElementById('remainingQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) {
                this.value = 1;
            } else if (value > 10000) {
                this.value = 10000;
            }
            updatePreview();
        });
    }

    // 할인값 입력 유효성 검사
    const discountValueInput = document.getElementById('discountValue');
    if (discountValueInput) {
        discountValueInput.addEventListener('input', function() {
            const discountType = document.getElementById('discountType').value;
            let value = parseInt(this.value);
            
            if (isNaN(value) || value < 1) {
                this.value = discountType === 'PERCENTAGE' ? 1 : 100;
            } else if (discountType === 'PERCENTAGE' && value > 100) {
                this.value = 100;
            } else if (discountType === 'AMOUNT' && value > 100000) {
                this.value = 100000;
            }
            updatePreview();
        });
    }

    // 쿠폰명 길이 제한
    const nameInput = document.getElementById('couponName');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            if (this.value.length > 50) {
                this.value = this.value.substring(0, 50);
            }
            updatePreview();
        });
    }

    // 키보드 단축키
    document.addEventListener('keydown', function(e) {
        // Ctrl+S로 저장
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (form && !isSubmitting) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // ESC로 초기화 확인
        if (e.key === 'Escape') {
            if (confirm('폼을 초기화하시겠습니까?')) {
                resetForm();
            }
        }
    });

    // 페이지 나가기 전 확인
    window.addEventListener('beforeunload', function(e) {
        if (isSubmitting) return; // 제출 중일 때는 확인하지 않음
        
        const hasUnsavedData = 
            (document.getElementById('couponName')?.value?.trim() && 
             document.getElementById('couponName').value.trim() !== `${eventData?.eventName || ''} 선착순 쿠폰`) ||
            (document.getElementById('customLocation')?.value?.trim());
        
        if (hasUnsavedData) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
};

// 페이지 초기화
const initializePage = async () => {
    console.log('선착순 쿠폰 생성 페이지 초기화 시작...');
    
    // URL에서 eventId 가져오기
    const eventId = getEventIdFromUrl();
    if (!eventId) {
        console.error('eventId를 가져올 수 없어 초기화를 중단합니다.');
        return;
    }

    // 로딩 상태 표시
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
                window.location.href = './events.html';
            }
        }, 3000);
        return;
    }

    // UI 업데이트
    updateEventInfoUI();
    updatePageTitle();

    // 병렬로 데이터 로드
    await Promise.all([
        loadDiscountPolicies(), // 이제 직접 입력 방식으로 초기화
        loadMembershipLevels(),
        loadPopupStores(eventId)
    ]);

    // 폼 초기화
    initializeDateInputs();
    
    // 이벤트 리스너 설정
    setupEventListeners();

    // 초기 미리보기 업데이트
    updatePreview();
    
    console.log('선착순 쿠폰 생성 페이지 초기화 완료');
    console.log('로드된 데이터:', {
        eventData,
        membershipLevels: membershipLevels.length,
        popupStores: popupStores.length
    });
};

// 전역 함수로 노출 (HTML에서 직접 호출하는 함수들)
window.updatePreview = updatePreview;
window.adjustQuantity = adjustQuantity;
window.adjustDiscountValue = adjustDiscountValue;
window.resetForm = resetForm;
window.goBack = goBack;
window.handlePopupStoreChange = handlePopupStoreChange;
window.handleDiscountTypeChange = handleDiscountTypeChange;

// 추가 유틸리티 함수들
window.showEventDetails = () => {
    if (eventData) {
        const details = `
이벤트 상세 정보:
━━━━━━━━━━━━━━━━━━━━
📌 이벤트명: ${eventData.eventName}
📝 설명: ${eventData.eventDescription || '설명 없음'}
📍 위치: ${eventData.address || '주소 없음'}
🗺️ 좌표: ${eventData.latitude}, ${eventData.longitude}
📏 반경: ${eventData.radiusMeter}m
📅 기간: ${eventData.startDate || '미정'} ~ ${eventData.endDate || '미정'}
⏰ 시간: ${eventData.openTime || '미정'} ~ ${eventData.closeTime || '미정'}
🏷️ 상태: ${eventData.eventStatus}
🆔 ID: ${eventData.eventId}
━━━━━━━━━━━━━━━━━━━━
        `;
        alert(details);
    }
};

window.refreshPopupStores = async () => {
    const eventId = eventData?.eventId;
    if (eventId) {
        await loadPopupStores(eventId);
        updatePreview();
        alert('팝업스토어 목록이 새로고침되었습니다.');
    }
};

// 할인 정책 미리 설정 함수들
window.setQuickDiscount = (type, value) => {
    const discountTypeSelect = document.getElementById('discountType');
    const discountValueInput = document.getElementById('discountValue');
    
    if (discountTypeSelect) discountTypeSelect.value = type;
    if (discountValueInput) discountValueInput.value = value;
    
    handleDiscountTypeChange();
    updatePreview();
};

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}