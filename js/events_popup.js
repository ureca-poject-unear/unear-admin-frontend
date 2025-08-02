// API 설정
const API_CONFIG = {
    BASE_URL: 'http://localhost:8082',
    ENDPOINTS: {
        POPUP_STORE: '/admin/events', // 팝업스토어 등록 기본 경로 (/{eventId}/places/popup이 추가됨)
        EVENT_INFO: '/admin/events' // 이벤트 정보 조회용
    }
};

// URL에서 eventId 추출 (개선된 버전)
const getEventIdFromUrl = () => {
    console.log('eventId 추출 시작...');
    
    // 방법 1: URL 쿼리 파라미터에서 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    let eventId = urlParams.get('eventId');
    console.log('URL 파라미터에서 가져온 eventId:', eventId);
    
    // 방법 2: 세션 스토리지에서 가져오기
    if (!eventId) {
        eventId = sessionStorage.getItem('selectedEventId');
        console.log('세션 스토리지에서 가져온 eventId:', eventId);
    }
    
    // 방법 3: URL fragment에서 가져오기 (#eventId=123 형태)
    if (!eventId && window.location.hash) {
        const hashMatch = window.location.hash.match(/eventId=(\d+)/);
        if (hashMatch) {
            eventId = hashMatch[1];
            console.log('URL fragment에서 가져온 eventId:', eventId);
        }
    }
    
    // 방법 4: 브라우저 history state에서 가져오기
    if (!eventId && window.history.state && window.history.state.eventId) {
        eventId = window.history.state.eventId;
        console.log('History state에서 가져온 eventId:', eventId);
    }
    
    // eventId 검증 및 정리
    if (eventId) {
        eventId = String(eventId).trim();
        // 숫자가 아닌 경우 제거
        if (!/^\d+$/.test(eventId)) {
            console.warn('유효하지 않은 eventId 형식:', eventId);
            eventId = null;
        }
    }
    
    console.log('최종 추출된 eventId:', eventId);
    
    if (!eventId) {
        console.error('eventId를 찾을 수 없습니다. 디버깅 정보:');
        console.log('- URL:', window.location.href);
        console.log('- URL params:', Object.fromEntries(urlParams));
        console.log('- sessionStorage:', sessionStorage.getItem('selectedEventId'));
        console.log('- hash:', window.location.hash);
        console.log('- history.state:', window.history.state);
        
        // 개발 중이라면 기본값 제공 (실제 운영에서는 제거)
        const confirmUseDefault = confirm(
            'eventId를 찾을 수 없습니다.\n\n' +
            '가능한 원인:\n' +
            '1. 이전 페이지에서 이벤트 등록이 완료되지 않음\n' +
            '2. 백엔드에서 eventId를 반환하지 않음\n' +
            '3. 브라우저 저장소가 초기화됨\n\n' +
            '이벤트 등록 페이지로 돌아가시겠습니까?'
        );
        
        if (!confirmUseDefault) {
            window.location.href = './events.html';
            return null;
        }
        
        // 사용자가 직접 eventId를 입력하도록 함
        eventId = prompt(
            '데이터베이스에서 확인한 이벤트 ID를 입력해주세요:\n' +
            '(숫자만 입력, 예: 1, 2, 3...)'
        );
        
        if (!eventId || !/^\d+$/.test(eventId.trim())) {
            alert('올바른 이벤트 ID를 입력해주세요.');
            window.location.href = './events.html';
            return null;
        }
        
        eventId = eventId.trim();
        console.log('사용자 입력 eventId:', eventId);
    }
    
    // 현재 eventId를 세션 스토리지에만 저장 (localStorage 제거)
    sessionStorage.setItem('selectedEventId', eventId);
    
    // URL에도 반영 (북마크 가능하도록)
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('eventId', eventId);
    window.history.replaceState({ eventId: eventId }, '', currentUrl);
    
    console.log('eventId 저장 완료:', eventId);
    return eventId;
};

// 이벤트 위치 정보 (동적으로 로드)
let eventLocationData = {
    eventId: null,
    eventName: "",
    latitude: null, // 이벤트에서 로드될 때까지 null
    longitude: null, // 이벤트에서 로드될 때까지 null
    radiusMeter: 1000
};

// 이벤트 정보 로드 (개선된 버전)
const loadEventInfo = async (eventId) => {
    console.log('이벤트 정보 로드 시작, eventId:', eventId);
    
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENT_INFO}/${eventId}`;
        console.log('요청 URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('응답 상태:', response.status);
        console.log('응답 헤더:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('이벤트 정보 로드 실패:', response.status, errorText);
            
            if (response.status === 404) {
                throw new Error(`이벤트 ID ${eventId}를 찾을 수 없습니다. 존재하는 이벤트 ID인지 확인해주세요.`);
            } else if (response.status === 401) {
                throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
            } else {
                throw new Error(`이벤트 정보를 가져올 수 없습니다. (${response.status}: ${errorText})`);
            }
        }

        const eventInfo = await response.json();
        console.log('이벤트 정보 응답:', eventInfo);
        
        // 응답 구조에 따라 데이터 추출 (여러 가능성 고려)
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
        
        eventLocationData = {
            eventId: eventId,
            eventName: extractData(eventInfo, 'eventName') || 
                     extractData(eventInfo, 'name') || 
                     `이벤트 ${eventId}`,
            latitude: Number(extractData(eventInfo, 'latitude')),      // 명시적 숫자 변환
            longitude: Number(extractData(eventInfo, 'longitude')),    // 명시적 숫자 변환
            radiusMeter: Number(extractData(eventInfo, 'radiusMeter') || 1000)  // 명시적 숫자 변환
        };

        console.log('파싱된 이벤트 데이터 (타입 확인):', {
            ...eventLocationData,
            types: {
                latitude: typeof eventLocationData.latitude,
                longitude: typeof eventLocationData.longitude,
                radiusMeter: typeof eventLocationData.radiusMeter
            }
        });

        // 좌표 검증 - 이벤트에서 가져온 좌표가 없으면 에러
        if (!eventLocationData.latitude || !eventLocationData.longitude) {
            throw new Error('이벤트의 위치 정보(위도/경도)가 설정되지 않았습니다. 이벤트 설정을 확인해주세요.');
        }

        // 좌표 범위 검증
        if (eventLocationData.latitude < -90 || eventLocationData.latitude > 90) {
            console.warn('유효하지 않은 위도:', eventLocationData.latitude);
            throw new Error(`유효하지 않은 이벤트 위도: ${eventLocationData.latitude}`);
        }
        
        if (eventLocationData.longitude < -180 || eventLocationData.longitude > 180) {
            console.warn('유효하지 않은 경도:', eventLocationData.longitude);
            throw new Error(`유효하지 않은 이벤트 경도: ${eventLocationData.longitude}`);
        }

        if (isNaN(eventLocationData.latitude) || isNaN(eventLocationData.longitude)) {
            throw new Error('이벤트의 위치 정보(위도/경도)가 올바른 숫자가 아닙니다.');
        }

        return true;
    } catch (error) {
        console.error('이벤트 정보 로드 오류:', error);
        
        // 더 구체적인 에러 메시지 제공
        if (error.message.includes('찾을 수 없습니다') || error.message.includes('위치 정보')) {
            alert(error.message + '\n\n이벤트 등록 시 위치 정보(위도/경도)가 제대로 설정되었는지 확인해주세요.');
        } else if (error.message.includes('인증')) {
            alert(error.message);
            window.location.href = '../index.html'; // 로그인 페이지로
            return false;
        } else {
            alert(`이벤트 정보를 불러올 수 없습니다: ${error.message}`);
        }
        
        return false;
    }
};

// 뒤로가기
const goBack = () => {
    window.location.href = './events.html';
};

// 에러 메시지 표시
const showError = (fieldId, message) => {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 4000);
    }
};

// 입력 검증
const validateForm = (data) => {
    let isValid = true;

    if (!data.placeName.trim()) {
        showError('storeName', '스토어 이름을 입력해주세요.');
        isValid = false;
    }

    if (!data.placeDesc.trim()) {
        showError('description', '스토어 설명을 입력해주세요.');
        isValid = false;
    }

    if (!data.categoryCode) {
        showError('category', '카테고리를 선택해주세요.');
        isValid = false;
    }

    if (!data.address.trim()) {
        showError('specificAddress', '상세 주소를 입력해주세요.');
        isValid = false;
    }

    if (!data.tel.trim()) {
        showError('contactInfo', '연락처 정보를 입력해주세요.');
        isValid = false;
    }

    if (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90) {
        showError('latitude', '올바른 위도를 입력해주세요 (-90 ~ 90).');
        isValid = false;
    }

    if (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180) {
        showError('longitude', '올바른 경도를 입력해주세요 (-180 ~ 180).');
        isValid = false;
    }

    if (data.startTime >= data.endTime) {
        showError('closeTime', '마감 시간은 오픈 시간보다 늦어야 합니다.');
        isValid = false;
    }

    return isValid;
};

// 미리보기 업데이트
const updatePreview = () => {
    const data = {
        name: document.getElementById('storeName').value.trim(),
        description: document.getElementById('description').value.trim(),
        category: document.getElementById('category').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        openTime: document.getElementById('openTime').value,
        closeTime: document.getElementById('closeTime').value,
        specificAddress: document.getElementById('specificAddress').value.trim(),
        contactInfo: document.getElementById('contactInfo').value.trim()
    };

    const previewContent = document.getElementById('previewContent');
    
    if (Object.values(data).some(val => val !== '')) {
        previewContent.classList.add('has-data');
        previewContent.innerHTML = `
            ${data.name ? `<div class="preview-item">
                <span class="preview-label">스토어 이름</span>
                <span class="preview-value">${data.name}</span>
            </div>` : ''}
            ${data.category ? `<div class="preview-item">
                <span class="preview-label">카테고리</span>
                <span class="preview-value">${data.category}</span>
            </div>` : ''}
            ${data.description ? `<div class="preview-item">
                <span class="preview-label">설명</span>
                <span class="preview-value">${data.description.length > 30 ? data.description.substring(0, 30) + '...' : data.description}</span>
            </div>` : ''}
            ${data.startDate && data.endDate ? `<div class="preview-item">
                <span class="preview-label">운영 기간</span>
                <span class="preview-value">${data.startDate} ~ ${data.endDate}</span>
            </div>` : ''}
            ${data.openTime && data.closeTime ? `<div class="preview-item">
                <span class="preview-label">운영 시간</span>
                <span class="preview-value">${data.openTime} ~ ${data.closeTime}</span>
            </div>` : ''}
            ${data.specificAddress ? `<div class="preview-item">
                <span class="preview-label">주소</span>
                <span class="preview-value">${data.specificAddress}</span>
            </div>` : ''}
            ${data.contactInfo ? `<div class="preview-item">
                <span class="preview-label">연락처</span>
                <span class="preview-value">${data.contactInfo}</span>
            </div>` : ''}
        `;
    } else {
        previewContent.classList.remove('has-data');
        previewContent.innerHTML = '<div class="empty-preview">정보를 입력하면 여기에 미리보기가 표시됩니다</div>';
    }
};

// 위치 미리보기 업데이트 (개선된 거리 계산)
const updateLocationPreview = () => {
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const locationPreview = document.getElementById('locationPreview');

    console.log('위치 미리보기 업데이트:', {
        입력위도: latitude,
        입력경도: longitude,
        이벤트위도: eventLocationData.latitude,
        이벤트경도: eventLocationData.longitude,
        이벤트반경: eventLocationData.radiusMeter
    });

    if (isNaN(latitude) || isNaN(longitude)) {
        locationPreview.innerHTML = '위치 정보가 생성되면 여기에 표시됩니다';
        return;
    }

    if (!eventLocationData.latitude || !eventLocationData.longitude) {
        locationPreview.innerHTML = '이벤트 정보를 불러오는 중...';
        return;
    }

    // 거리 계산
    const distance = calculateDistance(
        eventLocationData.latitude, 
        eventLocationData.longitude, 
        latitude, 
        longitude
    );

    if (distance === null) {
        locationPreview.innerHTML = '거리 계산 오류';
        return;
    }

    console.log('거리 계산 결과:', {
        계산된거리: distance,
        허용반경: eventLocationData.radiusMeter,
        반경내여부: distance <= eventLocationData.radiusMeter
    });

    // 반경 체크
    const isWithinRadius = distance <= eventLocationData.radiusMeter;
    const statusColor = isWithinRadius ? '#27ae60' : '#e74c3c';
    const statusIcon = isWithinRadius ? '✅' : '❌';
    const statusMessage = isWithinRadius ? 
        '이벤트 반경 내 위치' : 
        `이벤트 반경을 ${(distance - eventLocationData.radiusMeter).toLocaleString()}m 초과`;

    locationPreview.innerHTML = `
        <div style="text-align: center;">
            <div style="font-weight: 600; margin-bottom: 8px;">📍 팝업 스토어 위치</div>
            <div style="color: ${statusColor};">위도: ${latitude.toFixed(6)}</div>
            <div style="color: ${statusColor};">경도: ${longitude.toFixed(6)}</div>
            <div style="font-size: 12px; color: #666; margin-top: 8px;">
                이벤트 중심지로부터 <strong>${distance.toLocaleString()}m</strong> 거리
            </div>
            <div style="color: ${statusColor}; font-size: 12px; margin-top: 4px; font-weight: 600;">
                ${statusIcon} ${statusMessage}
            </div>
            <div style="font-size: 11px; color: #999; margin-top: 4px;">
                허용 반경: ${eventLocationData.radiusMeter.toLocaleString()}m
            </div>
            ${!isWithinRadius ? `
                <div style="color: #e74c3c; font-size: 11px; margin-top: 4px; padding: 4px; background: #fff5f5; border-radius: 4px;">
                    ⚠️ 권장: 이벤트 중심 (${eventLocationData.latitude.toFixed(4)}, ${eventLocationData.longitude.toFixed(4)}) 근처로 조정하세요
                </div>
            ` : ''}
        </div>
    `;
};

// 두 지점 간의 거리 계산 (미터 단위) - 하버사인 공식
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // 입력값 타입 검증 및 변환
    const numLat1 = Number(lat1);
    const numLon1 = Number(lon1);
    const numLat2 = Number(lat2);
    const numLon2 = Number(lon2);

    // NaN 검사
    if ([numLat1, numLon1, numLat2, numLon2].some(isNaN)) {
        console.error('거리 계산 오류 - 숫자가 아닌 값:', { lat1, lon1, lat2, lon2 });
        return null;
    }

    // 좌표 범위 검증
    if (numLat1 < -90 || numLat1 > 90 || numLat2 < -90 || numLat2 > 90) {
        console.error('위도 범위 오류:', { lat1: numLat1, lat2: numLat2 });
        return null;
    }
    
    if (numLon1 < -180 || numLon1 > 180 || numLon2 < -180 || numLon2 > 180) {
        console.error('경도 범위 오류:', { lon1: numLon1, lon2: numLon2 });
        return null;
    }

    // 동일 좌표 체크 (소수점 6자리 정밀도)
    if (Math.abs(numLat1 - numLat2) < 0.000001 && Math.abs(numLon1 - numLon2) < 0.000001) {
        console.log('동일한 좌표 감지 - 거리: 0m');
        return 0;
    }

    // 하버사인 공식
    const R = 6371000; // 지구 반지름 (미터)
    const φ1 = numLat1 * Math.PI / 180;
    const φ2 = numLat2 * Math.PI / 180;
    const Δφ = (numLat2 - numLat1) * Math.PI / 180;
    const Δλ = (numLon2 - numLon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c;
    return Math.round(distance);
};

// 이벤트 중심으로 위치 설정하는 헬퍼 함수
const setLocationToEventCenter = () => {
    if (eventLocationData.latitude && eventLocationData.longitude) {
        document.getElementById('latitude').value = eventLocationData.latitude.toFixed(6);
        document.getElementById('longitude').value = eventLocationData.longitude.toFixed(6);
        updateLocationPreview();
        console.log(`위치를 이벤트 중심으로 설정: ${eventLocationData.latitude}, ${eventLocationData.longitude}`);
    } else {
        console.error('이벤트 위치 정보가 없어서 중심으로 설정할 수 없습니다.');
        alert('이벤트의 위치 정보가 없습니다. 이벤트 설정을 확인해주세요.');
    }
};

// 성공 모달 표시
const showSuccessModal = () => {
    // 성공 모달 HTML이 없다면 간단한 성공 처리
    alert('팝업 스토어가 성공적으로 등록되었습니다!');
    
    setTimeout(() => {
        const nextStep = confirm('계속해서 다른 작업을 하시겠습니까?\n\n아니오를 선택하면 이벤트 목록으로 돌아갑니다.');
        if (!nextStep) {
            goBack();
        } else {
            // 폼 초기화
            document.getElementById('popupStoreForm').reset();
            // 미리보기 초기화
            updatePreview();
            updateLocationPreview();
            // 기본값 재설정
            initializeDefaultValues();
        }
    }, 1000);
};

// 기본값 설정 함수
const initializeDefaultValues = () => {
    // 기본 날짜 설정
    const today = new Date().toISOString().split('T')[0];
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    
    if (startDateEl) startDateEl.value = today;
    
    if (endDateEl) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        endDateEl.value = nextWeek.toISOString().split('T')[0];
    }

    // 기본 시간 설정
    const openTimeEl = document.getElementById('openTime');
    const closeTimeEl = document.getElementById('closeTime');
    
    if (openTimeEl) openTimeEl.value = '10:00';
    if (closeTimeEl) closeTimeEl.value = '22:00';

    // 기본 위치를 이벤트 위치로 설정
    if (eventLocationData.latitude && eventLocationData.longitude) {
        setLocationToEventCenter();
    }
};

// 로딩 상태 관리
const setLoading = (isLoading) => {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        if (isLoading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = '등록 중...';
            }
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = '팝업 스토어 등록하기';
            }
        }
    }
};

// 폼 제출 이벤트 핸들러
const handleFormSubmit = async (e) => {
    e.preventDefault();

    // 시간을 정수로 변환하는 함수 (예: "10:30" -> 1030)
    const timeToInt = (timeStr) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':');
        return parseInt(hours) * 100 + parseInt(minutes);
    };

    // 카테고리 매핑 함수 (한글 -> 영문 enum)
    const mapCategory = (category) => {
        const categoryMap = {
            '푸드': 'FOOD',
            '생활/편의': 'LIFE',
            '뷰티/건강': 'BEAUTY',
            '액티비티': 'ACTIVITY',
            '교육': 'EDUCATION',
            '문화/여가': 'CULTURE',
            '베이커리': 'BAKERY',
            '쇼핑': 'SHOPPING',
            '카페': 'CAFE'
        };
        return categoryMap[category] || 'ETC';
    };

    const data = {
        placeName: document.getElementById('storeName').value.trim(),
        placeDesc: document.getElementById('description').value.trim(),
        address: document.getElementById('specificAddress').value.trim(),
        tel: document.getElementById('contactInfo').value.trim(),
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        startTime: timeToInt(document.getElementById('openTime').value),
        endTime: timeToInt(document.getElementById('closeTime').value),
        categoryCode: mapCategory(document.getElementById('category').value),
        markerCode: 'POPUP', // 팝업스토어 고정값
        eventCode: 'NONE', // 기본값
        benefitCategory: null, // 선택사항
        franchiseId: null // 선택사항
    };

    console.log('팝업 스토어 등록 데이터:', data);
    console.log('이벤트 위치 데이터:', eventLocationData);

    if (!validateForm(data)) {
        return;
    }

    // 거리 검증 추가
    const distance = calculateDistance(
        eventLocationData.latitude, 
        eventLocationData.longitude, 
        data.latitude, 
        data.longitude
    );

    if (distance > eventLocationData.radiusMeter) {
        const confirmContinue = confirm(
            `팝업 스토어가 이벤트 반경(${eventLocationData.radiusMeter}m)을 ${distance - eventLocationData.radiusMeter}m 벗어나 있습니다.\n` +
            `그래도 등록하시겠습니까?\n\n` +
            `권장 위치: 이벤트 중심 (${eventLocationData.latitude.toFixed(4)}, ${eventLocationData.longitude.toFixed(4)}) 근처`
        );
        
        if (!confirmContinue) {
            return;
        }
    }

    setLoading(true);

    try {
        // 올바른 백엔드 엔드포인트 사용
        const requestUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.POPUP_STORE}/${eventLocationData.eventId}/places/popup`;
        console.log('요청 URL:', requestUrl);
        console.log('요청 데이터:', data);
        
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        console.log('응답 상태:', response.status);

        const contentType = response.headers.get('content-type');
        let result = null;

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            result = { message: text };
        }

        console.log('백엔드 응답:', result);

        if (response.ok) {
            // 성공 애니메이션
            const formCard = document.querySelector('.form-card');
            if (formCard) {
                formCard.classList.add('success-animation');
            }
            showSuccessModal();
        } else {
            console.error('등록 실패:', result);
            let errorMessage = '오류가 발생했습니다.';
            
            if (result.message) {
                errorMessage = result.message;
            } else if (response.status === 404) {
                errorMessage = `이벤트 ID ${eventLocationData.eventId}를 찾을 수 없습니다.`;
            } else if (response.status === 400) {
                errorMessage = '입력 데이터가 올바르지 않습니다.';
            } else if (response.status === 401) {
                errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
            }
            
            alert(`등록 실패: ${errorMessage}`);
        }
    } catch (error) {
        console.error('팝업 스토어 등록 오류:', error);
        alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        setLoading(false);
    }
};

// 이벤트 리스너 설정
const setupEventListeners = () => {
    // 폼 제출 이벤트
    const form = document.getElementById('popupStoreForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 실시간 미리보기 업데이트
    const inputs = [
        'storeName', 'description', 'category', 
        'startDate', 'endDate', 'openTime', 'closeTime', 
        'specificAddress', 'contactInfo'
    ];

    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updatePreview);
        }
    });

    // 위치 관련 입력 이벤트
    ['latitude', 'longitude'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateLocationPreview);
        }
    });
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

    // 로딩 표시
    const locationInfo = document.getElementById('locationInfo');
    if (locationInfo) {
        locationInfo.innerHTML = `
            <div class="location-icon">⏳</div>
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
        if (locationInfo) {
            locationInfo.innerHTML = `
                <div class="location-icon">❌</div>
                <div>
                    <div style="color: #e74c3c;">이벤트 정보 로드 실패</div>
                    <div style="font-size: 12px; opacity: 0.8;">eventId: ${eventId}</div>
                </div>
            `;
        }
        
        // 5초 후 이벤트 목록으로 자동 이동
        setTimeout(() => {
            if (confirm('이벤트 목록 페이지로 돌아가시겠습니까?')) {
                goBack();
            }
        }, 5000);
        return;
    }

    // 이벤트 정보 표시
    if (locationInfo) {
        locationInfo.innerHTML = `
            <div class="location-icon">📍</div>
            <div>
                <div>${eventLocationData.eventName}</div>
                <div style="font-size: 12px; opacity: 0.8;">
                    반경 ${eventLocationData.radiusMeter.toLocaleString()}m 내 
                    (중심: ${eventLocationData.latitude.toFixed(4)}, ${eventLocationData.longitude.toFixed(4)})
                </div>
            </div>
        `;
    }

    // 이벤트 리스너 설정
    setupEventListeners();

    // 기본값 설정
    initializeDefaultValues();
    
    // 초기 미리보기 업데이트
    updatePreview();
    updateLocationPreview();
    
    console.log('페이지 초기화 완료');
};

// 이벤트 중심으로 위치 재설정 버튼 (HTML에 버튼이 있다면)
const resetToEventCenter = () => {
    setLocationToEventCenter();
    alert(`위치가 이벤트 중심으로 설정되었습니다.\n(${eventLocationData.latitude.toFixed(6)}, ${eventLocationData.longitude.toFixed(6)})`);
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializePage);