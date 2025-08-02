// API 설정
const API_CONFIG = {
    BASE_URL: 'http://localhost:8082',
    ENDPOINTS: {
        EVENTS: '/admin/events'
    }
};

// SessionManager
const SessionManager = {
    get: () => {
        const stored = localStorage.getItem('posSessionInfo') || sessionStorage.getItem('admin');
        return stored ? JSON.parse(stored) : null;
    },
    isLoggedIn: () => SessionManager.get() !== null
};

// 뒤로가기
const goBack = () => {
    window.location.href = '../html/main.html';
};

// 현재 위치 가져오기
const getCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
                updatePreview();
                updateMap();
            },
            (error) => {
                alert('위치 정보를 가져올 수 없습니다.');
                console.error('위치 오류:', error);
            }
        );
    } else {
        alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
    }
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

    if (!data.eventName.trim()) {
        showError('eventName', '이벤트 이름을 입력해주세요.');
        isValid = false;
    }

    if (!data.description.trim()) {
        showError('description', '이벤트 설명을 입력해주세요.');
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

    if (data.radiusMeter < 100 || data.radiusMeter > 10000) {
        showError('radiusMeter', '반경은 100m ~ 10,000m 사이로 입력해주세요.');
        isValid = false;
    }

    if (new Date(data.startAt) >= new Date(data.endAt)) {
        showError('endDate', '종료일은 시작일보다 늦어야 합니다.');
        isValid = false;
    }

    return isValid;
};

// 미리보기 업데이트
const updatePreview = () => {
    const data = {
        eventName: document.getElementById('eventName').value.trim(),
        description: document.getElementById('description').value.trim(),
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        radiusMeter: parseInt(document.getElementById('radiusMeter').value),
        startAt: document.getElementById('startDate').value,
        endAt: document.getElementById('endDate').value,
    };

    const previewContent = document.getElementById('previewContent');
    
    if (Object.values(data).some(val => val !== '' && !isNaN(val))) {
        previewContent.classList.add('has-data');
        previewContent.innerHTML = `
            ${data.eventName ? `<div class="preview-item">
                <span class="preview-label">이벤트 이름</span>
                <span class="preview-value">${data.eventName}</span>
            </div>` : ''}
            ${data.description ? `<div class="preview-item">
                <span class="preview-label">설명</span>
                <span class="preview-value">${data.description.length > 50 ? data.description.substring(0, 50) + '...' : data.description}</span>
            </div>` : ''}
            ${!isNaN(data.latitude) && !isNaN(data.longitude) ? `<div class="preview-item">
                <span class="preview-label">위치</span>
                <span class="preview-value">${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}</span>
            </div>` : ''}
            ${data.radiusMeter ? `<div class="preview-item">
                <span class="preview-label">반경</span>
                <span class="preview-value">${data.radiusMeter.toLocaleString()}m</span>
            </div>` : ''}
            ${data.startAt && data.endAt ? `<div class="preview-item">
                <span class="preview-label">기간</span>
                <span class="preview-value">${data.startAt} ~ ${data.endAt}</span>
            </div>` : ''}
        `;
    } else {
        previewContent.classList.remove('has-data');
        previewContent.innerHTML = '<div class="empty-preview">정보를 입력하면 여기에 미리보기가 표시됩니다</div>';
    }
};

// 지도 업데이트 (실제로는 지도 API를 사용해야 함)
const updateMap = () => {
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const mapContainer = document.getElementById('mapContainer');

    if (!isNaN(latitude) && !isNaN(longitude)) {
        mapContainer.innerHTML = `
            <div style="text-align: center;">
                <div style="font-weight: 600; margin-bottom: 8px;">📍 이벤트 위치</div>
                <div style="color: #3498db;">위도: ${latitude.toFixed(6)}</div>
                <div style="color: #3498db;">경도: ${longitude.toFixed(6)}</div>
                <div style="font-size: 12px; color: #999; margin-top: 8px;">
                    실제 서비스에서는 지도가 표시됩니다
                </div>
            </div>
        `;
    } else {
        mapContainer.innerHTML = '위치 정보를 입력하면 지도가 표시됩니다';
    }
};

// 로딩 상태 관리
const setLoading = (isLoading) => {
    const submitBtn = document.getElementById('submitBtn');
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = '등록 중...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = '이벤트 등록하기';
    }
};

// eventId 추출 함수 개선 - 더 많은 가능성 고려
const extractEventId = (response, responseHeaders) => {
    console.log('백엔드 응답 전체:', response);
    console.log('응답 헤더:', responseHeaders);
    
    // 1. 응답 본문에서 eventId 찾기 (다양한 패턴)
    const possiblePaths = [
        // 직접적인 ID 필드들
        response?.eventId,
        response?.id,
        
        // data 래퍼 안의 ID들
        response?.data?.eventId,
        response?.data?.id,
        response?.data?.event?.id,
        response?.data?.event?.eventId,
        
        // result 래퍼 안의 ID들
        response?.result?.eventId,
        response?.result?.id,
        response?.result?.event?.id,
        
        // 중첩된 구조들
        response?.event?.id,
        response?.event?.eventId,
        response?.entity?.id,
        response?.entity?.eventId,
        
        // 배열 응답의 첫 번째 요소
        response?.[0]?.id,
        response?.[0]?.eventId,
        response?.data?.[0]?.id,
        response?.data?.[0]?.eventId
    ];
    
    for (const path of possiblePaths) {
        if (path && (typeof path === 'string' || typeof path === 'number')) {
            const eventId = String(path);
            if (/^\d+$/.test(eventId)) {
                console.log('eventId 찾음 (경로):', eventId);
                return eventId;
            }
        }
    }
    
    // 2. Location 헤더에서 추출 (POST 요청 후 일반적인 패턴)
    if (responseHeaders) {
        const locationHeader = responseHeaders.get('location') || responseHeaders.get('Location');
        if (locationHeader) {
            // /admin/events/123 같은 패턴
            const patterns = [
                /\/events\/(\d+)/,
                /\/admin\/events\/(\d+)/,
                /events\/(\d+)/,
                /id[=:](\d+)/i,
                /eventId[=:](\d+)/i
            ];
            
            for (const pattern of patterns) {
                const match = locationHeader.match(pattern);
                if (match) {
                    console.log('Location 헤더에서 eventId 추출:', match[1]);
                    return match[1];
                }
            }
        }
    }
    
    // 3. 응답이 단순 숫자 문자열인 경우 (예: "123")
    if (typeof response === 'string' && /^\d+$/.test(response.trim())) {
        console.log('단순 숫자 문자열 eventId:', response.trim());
        return response.trim();
    }
    
    // 4. 메시지에서 ID 추출 시도
    const messageFields = [response?.message, response?.msg, response?.description];
    for (const message of messageFields) {
        if (message && typeof message === 'string') {
            // "이벤트가 생성되었습니다. ID: 123" 같은 패턴
            const patterns = [
                /ID[:\s]*(\d+)/i,
                /eventId[:\s]*(\d+)/i,
                /이벤트[^\d]*(\d+)/,
                /생성[^\d]*(\d+)/,
                /등록[^\d]*(\d+)/
            ];
            
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match) {
                    console.log('메시지에서 eventId 추출:', match[1]);
                    return match[1];
                }
            }
        }
    }
    
    // 5. 응답을 JSON 문자열로 변환해서 숫자 패턴 찾기 (최후의 수단)
    try {
        const responseStr = JSON.stringify(response);
        const numberMatches = responseStr.match(/\d+/g);
        if (numberMatches && numberMatches.length === 1) {
            // 응답에 숫자가 하나만 있으면 그것이 eventId일 가능성이 높음
            console.log('응답에서 유일한 숫자 eventId 추출:', numberMatches[0]);
            return numberMatches[0];
        }
    } catch (e) {
        console.warn('JSON 파싱 실패:', e);
    }
    
    console.warn('eventId를 찾을 수 없습니다. 응답 구조를 확인하세요:', response);
    return null;
};

// 폼 제출
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        eventName: document.getElementById('eventName').value.trim(),
        description: document.getElementById('description').value.trim(),
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        radiusMeter: parseInt(document.getElementById('radiusMeter').value),
        startAt: document.getElementById('startDate').value,
        endAt: document.getElementById('endDate').value,
    };

    if (!validateForm(data)) {
        return;
    }

    setLoading(true);

    try {
        console.log('이벤트 등록 요청 데이터:', data);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        console.log('응답 상태:', response.status);
        console.log('응답 헤더:', response.headers);

        const contentType = response.headers.get('content-type');
        let result = null;

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            console.log('텍스트 응답:', text);
            result = { message: text };
        }

        if (response.ok) {
            // 성공 애니메이션
            document.querySelector('.form-card').classList.add('success-animation');
            
            console.log('이벤트 등록 성공 응답:', result);
            
            // 개선된 eventId 추출 (응답 헤더도 전달)
            let eventId = extractEventId(result, response.headers);
            
            console.log('최종 추출된 eventId:', eventId);
            
            if (!eventId) {
                console.error('백엔드에서 eventId를 반환하지 않았습니다.');
                console.log('전체 응답:', result);
                console.log('응답 헤더:', [...response.headers.entries()]);
                
                // 백엔드 개발자에게 유용한 디버깅 정보 표시
                const debugInfo = `
디버깅 정보:
- 응답 상태: ${response.status}
- Content-Type: ${response.headers.get('content-type')}
- Location 헤더: ${response.headers.get('location') || '없음'}
- 응답 본문: ${JSON.stringify(result, null, 2)}

백엔드에서 eventId를 반환하는 방법:
1. 응답 본문에 "id" 또는 "eventId" 필드 추가
2. Location 헤더에 "/admin/events/{eventId}" 형태로 추가
3. 메시지에 "ID: {eventId}" 형태로 추가
                `;
                
                console.log(debugInfo);
                
                // 사용자에게는 간단한 메시지만 표시
                eventId = prompt(
                    '이벤트가 등록되었지만 ID를 자동으로 가져올 수 없습니다.\n' +
                    '생성된 이벤트 ID를 입력해주세요:\n' +
                    '(개발자 도구 콘솔에서 디버깅 정보를 확인할 수 있습니다)'
                );
                
                // 입력받은 eventId 검증
                if (eventId && !/^\d+$/.test(eventId.trim())) {
                    alert('올바른 숫자 ID를 입력해주세요.');
                    eventId = null;
                } else if (eventId) {
                    eventId = eventId.trim();
                }
            }
            
            console.log('최종 사용할 eventId:', eventId);
            
            // eventId 저장 (여러 곳에 저장하여 안전성 확보)
            if (eventId) {
                sessionStorage.setItem('selectedEventId', eventId);
                localStorage.setItem('currentEventId', eventId);
                
                // URL에도 저장하여 페이지 새로고침 시에도 유지
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('eventId', eventId);
                window.history.replaceState({ eventId: eventId }, '', currentUrl);
                
                console.log('eventId 저장 완료:', {
                    sessionStorage: sessionStorage.getItem('selectedEventId'),
                    localStorage: localStorage.getItem('currentEventId'),
                    url: currentUrl.searchParams.get('eventId')
                });
                
                alert('이벤트가 성공적으로 등록되었습니다!');
                
                // 팝업스토어 등록 페이지로 이동
                setTimeout(() => {
                    window.location.href = `./events_popup.html?eventId=${eventId}`;
                }, 1000);
            } else {
                // eventId가 없어도 성공은 알림
                alert('이벤트가 등록되었지만 자동으로 다음 단계로 이동할 수 없습니다.\n수동으로 팝업스토어 등록 페이지로 이동해주세요.');
                setTimeout(() => {
                    window.location.href = './events_popup.html';
                }, 2000);
            }
        } else {
            console.error('등록 실패 응답:', result);
            alert(`등록 실패: ${result.message || '오류가 발생했습니다.'}`);
        }
    } catch (error) {
        console.error('이벤트 등록 오류:', error);
        alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        setLoading(false);
    }
});

// 실시간 미리보기 업데이트
const inputs = ['eventName', 'description', 'latitude', 'longitude', 'radiusMeter', 'startDate', 'endDate'];
inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', updatePreview);
        if (id === 'latitude' || id === 'longitude') {
            element.addEventListener('input', updateMap);
        }
    }
});

// 사용자 정보 표시
const displayUserInfo = () => {
    const admin = SessionManager.get();
    if (admin) {
        const userName = admin.name || admin.email || '관리자';
        const userNameElement = document.getElementById('userName');
        const userAvatarElement = document.getElementById('userAvatar');
        if (userNameElement) userNameElement.textContent = userName;
        if (userAvatarElement) userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    }
};

// 페이지 초기화
const initializePage = () => {
    if (!SessionManager.isLoggedIn()) {
        alert("로그인이 필요합니다.");
        window.location.href = "../index.html";
        return;
    }

    displayUserInfo();
    
    // 기본 좌표는 설정하지 않음 (사용자가 직접 입력하거나 현재 위치 버튼 사용)
    
    // 오늘 날짜를 기본값으로 설정
    const today = new Date().toISOString().split('T')[0];
    const startDateElement = document.getElementById('startDate');
    if (startDateElement) startDateElement.value = today;
    
    // 종료일은 7일 후로 설정
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const endDateElement = document.getElementById('endDate');
    if (endDateElement) endDateElement.value = nextWeek.toISOString().split('T')[0];
    
    // 초기 미리보기 업데이트
    updatePreview();
    updateMap();
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializePage);