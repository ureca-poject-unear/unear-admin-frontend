 const API_GET_URL = 'http://localhost:8082/admin/places';
        const API_POST_URL = 'http://localhost:8080/admin/events';
        const API_PUT_URL = 'http://localhost:8082/admin/places';
        const API_DELETE_URL = 'http://localhost:8082/admin/places';
        
        // 전역 변수
        let places = [];
        let filteredPlaces = [];
        let currentEditId = null;

        // 초기 로드
        document.addEventListener('DOMContentLoaded', function() {
            loadPlaces();
        });

        // 제휴처 목록 로드
        async function loadPlaces() {
            const container = document.getElementById('placesContainer');
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>제휴처 목록을 불러오는 중...</div>
                </div>
            `;

            try {
                const response = await fetch(API_GET_URL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    credentials: 'include',
                    mode: 'cors'
                });
                
                if (!response.ok) {
                    if (response.status === 403) {
                        throw new Error(`접근 권한이 없습니다. 관리자에게 문의하세요. (상태코드: ${response.status})`);
                    } else if (response.status === 401) {
                        throw new Error(`인증이 필요합니다. 로그인을 확인해주세요. (상태코드: ${response.status})`);
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }
                
                const result = await response.json();
                
                console.log('API Response:', result);
                console.log('API Response type:', typeof result);
                console.log('API Response data:', result.data);
                console.log('API Response data type:', typeof result.data);
                
                // 먼저 전역 변수를 빈 배열로 초기화
                places = [];
                filteredPlaces = [];
                
                // 응답 형태에 따른 안전한 데이터 처리
                if (result && result.resultCode === 200) {
                    let dataToProcess = result.data;
                    
                    // null이나 undefined 체크
                    if (dataToProcess == null) {
                        console.log('Data is null or undefined, using empty array');
                        places = [];
                    }
                    // 배열인 경우
                    else if (Array.isArray(dataToProcess)) {
                        console.log('Data is array, length:', dataToProcess.length);
                        places = dataToProcess;
                    }
                    // 객체인 경우 (페이지네이션 등)
                    else if (typeof dataToProcess === 'object') {
                        console.log('Data is object, checking for nested arrays...');
                        
                        // 다양한 페이지네이션 형태 확인
                        if (Array.isArray(dataToProcess.content)) {
                            places = dataToProcess.content;
                            console.log('Found content array, length:', places.length);
                        } else if (Array.isArray(dataToProcess.list)) {
                            places = dataToProcess.list;
                            console.log('Found list array, length:', places.length);
                        } else if (Array.isArray(dataToProcess.items)) {
                            places = dataToProcess.items;
                            console.log('Found items array, length:', places.length);
                        } else if (Array.isArray(dataToProcess.data)) {
                            places = dataToProcess.data;
                            console.log('Found nested data array, length:', places.length);
                        } else {
                            // 단일 객체인 경우 배열로 변환
                            console.log('Single object detected, converting to array');
                            places = [dataToProcess];
                        }
                    }
                    // 기본 타입인 경우
                    else {
                        console.log('Data is primitive type, using empty array');
                        places = [];
                    }
                } else {
                    // API 응답 자체가 배열인 경우 (일부 API는 직접 배열을 반환)
                    if (Array.isArray(result)) {
                        console.log('Direct array response detected');
                        places = result;
                    } else {
                        throw new Error(result?.message || '데이터를 불러오는데 실패했습니다.');
                    }
                }
                
                // 최종 검증: places가 배열이 아니면 빈 배열로 설정
                if (!Array.isArray(places)) {
                    console.error('Final safety check: places is not an array, type:', typeof places, 'value:', places);
                    places = [];
                }
                
                // filteredPlaces도 안전하게 복사
                try {
                    filteredPlaces = [...places];
                } catch (error) {
                    console.error('Error copying places array:', error);
                    filteredPlaces = [];
                }
                
                console.log('Final places array:', places);
                console.log('Places array length:', places.length);
                
                renderPlaces(filteredPlaces);
                
            } catch (error) {
                console.error('Error loading places:', error);
                
                // 오류 발생시에도 전역 변수를 안전하게 초기화
                places = [];
                filteredPlaces = [];
                
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    container.innerHTML = `
                        <div class="error-message">
                            서버에 연결할 수 없습니다. 
                            <br>• 백엔드 서버가 실행 중인지 확인해주세요
                            <br>• CORS 설정을 확인해주세요
                            <br>• 네트워크 연결을 확인해주세요
                            <br><br>
                            <button class="add-btn" onclick="loadPlaces()">다시 시도</button>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="error-message">
                            ${error.message}
                            <br><br>
                            <button class="add-btn" onclick="loadPlaces()">다시 시도</button>
                        </div>
                    `;
                }
            }
        }

        // 제휴처 목록 렌더링
        function renderPlaces(data) {
            const container = document.getElementById('placesContainer');
            
            // 안전장치: data가 배열이 아닌 경우 처리
            if (!Array.isArray(data)) {
                console.error('renderPlaces: data is not an array:', data);
                // 단일 객체인 경우 배열로 변환 시도
                if (data && typeof data === 'object') {
                    data = [data];
                } else {
                    data = [];
                }
            }
            
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🤝</div>
                        <div class="empty-title">제휴처가 없습니다</div>
                        <div class="empty-text">새로운 제휴처를 추가해보세요</div>
                        <button class="add-btn" onclick="openModal('add')">
                            ➕ 첫 제휴처 추가하기
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="partnerships-list">
                    ${data.map(place => `
                        <div class="partnership-item">
                            <div class="item-header">
                                <div class="item-main-info">
                                    <div class="item-title">${place.name || '이름 없음'}</div>
                                    <div class="item-description">ID: ${place.id || 'N/A'}</div>
                                    <div class="item-badges">
                                        <span class="status-badge status-active">
                                            활성
                                        </span>
                                    </div>
                                </div>
                                <div class="item-actions">
                                    <button class="action-btn btn-view" onclick="viewPlace(${place.id})">
                                        상세
                                    </button>
                                    <button class="action-btn btn-edit" onclick="editPlace(${place.id})">
                                        수정
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deletePlace(${place.id})">
                                        삭제
                                    </button>
                                </div>
                            </div>

                            <div class="item-content">
                                <div class="item-details">
                                    <div class="detail-row">
                                        <div class="detail-icon">📍</div>
                                        <div class="detail-content">
                                            <div class="detail-label">주소</div>
                                            <div class="detail-value">${place.address || '주소 없음'}</div>
                                            ${place.latitude && place.longitude ? `
                                                <div class="detail-value coordinates">
                                                    ${Number(place.latitude).toFixed(4)}, ${Number(place.longitude).toFixed(4)}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>

                                    <div class="detail-row">
                                        <div class="detail-icon">📞</div>
                                        <div class="detail-content">
                                            <div class="detail-label">전화번호</div>
                                            <div class="detail-value">${place.tel || '전화번호 없음'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="item-meta">
                                    <div class="meta-section">
                                        <div class="meta-title">ID</div>
                                        <div class="meta-value">#${place.id || 'N/A'}</div>
                                    </div>
                                    
                                    <div class="meta-section">
                                        <div class="meta-title">위치</div>
                                        <div class="meta-value">
                                            ${place.latitude && place.longitude ? 
                                                `${Number(place.latitude).toFixed(4)}, ${Number(place.longitude).toFixed(4)}` : 
                                                '미설정'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 필터링
        function filterPlaces() {
            const searchName = document.getElementById('searchName').value.toLowerCase();

            // places가 배열인지 확인하고 안전하게 처리
            if (!Array.isArray(places)) {
                console.error('places is not an array in filterPlaces:', places);
                filteredPlaces = [];
                renderPlaces(filteredPlaces);
                return;
            }

            try {
                filteredPlaces = places.filter(place => {
                    if (!place || typeof place !== 'object') return false;
                    const matchesName = place.name && place.name.toLowerCase().includes(searchName);
                    return matchesName;
                });
            } catch (error) {
                console.error('Error filtering places:', error);
                filteredPlaces = [];
            }

            renderPlaces(filteredPlaces);
        }

        // 모달 열기
        function openModal(mode, placeId = null) {
            const modal = document.getElementById('placeModal');
            const modalTitle = document.getElementById('modalTitle');
            
            if (mode === 'add') {
                modalTitle.textContent = '새 제휴처 추가';
                resetForm();
                currentEditId = null;
            } else if (mode === 'edit') {
                modalTitle.textContent = '제휴처 정보 수정';
                
                // places가 배열인지 확인
                if (Array.isArray(places)) {
                    const place = places.find(p => p && p.id === placeId);
                    if (place) {
                        fillForm(place);
                        currentEditId = placeId;
                    }
                }
            }
            
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        // 모달 닫기
        function closeModal() {
            const modal = document.getElementById('placeModal');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetForm();
        }

        // 폼 초기화
        function resetForm() {
            document.getElementById('placeForm').reset();
            currentEditId = null;
        }

        // 폼 채우기 (수정 모드)
        function fillForm(place) {
            document.getElementById('placeName').value = place.name || '';
            document.getElementById('tel').value = place.tel || '';
            document.getElementById('address').value = place.address || '';
            document.getElementById('latitude').value = place.latitude || '';
            document.getElementById('longitude').value = place.longitude || '';
        }

        // 제휴처 저장
        async function savePlace() {
            const form = document.getElementById('placeForm');
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = {
                placeName: document.getElementById('placeName').value,
                tel: document.getElementById('tel').value,
                address: document.getElementById('address').value,
                latitude: document.getElementById('latitude').value ? parseFloat(document.getElementById('latitude').value) : null,
                longitude: document.getElementById('longitude').value ? parseFloat(document.getElementById('longitude').value) : null
            };

            try {
                let response;
                
                if (currentEditId) {
                    // 수정 - PUT 요청
                    response = await fetch(`${API_PUT_URL}/${currentEditId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        credentials: 'include',
                        mode: 'cors',
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 추가 - POST 요청
                    response = await fetch(API_POST_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        credentials: 'include',
                        mode: 'cors',
                        body: JSON.stringify(formData)
                    });
                }

                if (!response.ok) {
                    if (response.status === 403) {
                        throw new Error('접근 권한이 없습니다.');
                    } else if (response.status === 401) {
                        throw new Error('인증이 필요합니다.');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.resultCode === 200) {
                    alert(currentEditId ? '제휴처 정보가 수정되었습니다.' : '새 제휴처가 추가되었습니다.');
                    closeModal();
                    loadPlaces();
                } else {
                    throw new Error(result.message || '저장에 실패했습니다.');
                }
            } catch (error) {
                console.error('Error saving place:', error);
                alert(`저장 중 오류가 발생했습니다: ${error.message}`);
            }
        }

        // 제휴처 수정
        function editPlace(id) {
            openModal('edit', id);
        }

        // 제휴처 상세보기
        function viewPlace(id) {
            // places가 배열인지 확인
            if (!Array.isArray(places)) {
                console.error('places is not an array in viewPlace:', places);
                alert('데이터 오류가 발생했습니다.');
                return;
            }
            
            const place = places.find(p => p && p.id === id);
            if (!place) {
                alert('해당 제휴처를 찾을 수 없습니다.');
                return;
            }

            const details = `
업체명: ${place.name || '정보 없음'}
ID: ${place.id || 'N/A'}
주소: ${place.address || '정보 없음'}
전화번호: ${place.tel || '정보 없음'}
위치: ${place.latitude && place.longitude ? `${place.latitude}, ${place.longitude}` : '미설정'}
            `;
            
            alert(details);
        }

        // 제휴처 삭제
        async function deletePlace(id) {
            // places가 배열인지 확인
            if (!Array.isArray(places)) {
                console.error('places is not an array in deletePlace:', places);
                alert('데이터 오류가 발생했습니다.');
                return;
            }
            
            const place = places.find(p => p && p.id === id);
            if (!place) {
                alert('해당 제휴처를 찾을 수 없습니다.');
                return;
            }

            if (!confirm(`'${place.name || '이름 없음'}'을(를) 정말 삭제하시겠습니까?`)) {
                return;
            }

            try {
                const response = await fetch(`${API_DELETE_URL}?placeId=${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    credentials: 'include',
                    mode: 'cors'
                });

                if (!response.ok) {
                    if (response.status === 403) {
                        throw new Error('접근 권한이 없습니다.');
                    } else if (response.status === 401) {
                        throw new Error('인증이 필요합니다.');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.resultCode === 200) {
                    alert('제휴처가 삭제되었습니다.');
                    loadPlaces();
                } else {
                    throw new Error(result.message || '삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('Error deleting place:', error);
                alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
            }
        }

        // 모달 외부 클릭시 닫기
        window.onclick = function(event) {
            const modal = document.getElementById('placeModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });