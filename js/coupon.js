// 전역 변수
        let coupons = [];
        let filteredCoupons = [];
        let currentEditId = null;

        // 초기 로드
        document.addEventListener('DOMContentLoaded', function() {
            loadCoupons();
        });

        // API Base URL (실제 배포 환경)
        const API_BASE_URL = 'https://dev.unear.site/api/admin';
        const COUPON_ENDPOINT = '/coupons'; // admin을 제거한 엔드포인트

        // 쿠폰 목록 로드
        async function loadCoupons() {
            try {
                showLoading();

                // 실제 API 호출
                const response = await fetch(`${API_BASE_URL}${COUPON_ENDPOINT}`, {
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error('쿠폰 목록을 불러오는데 실패했습니다.');
                }
                const data = await response.json();
                
                coupons = data;
                filteredCoupons = [...coupons];
                renderCoupons();
                
            } catch (error) {
                console.error('Error loading coupons:', error);
                showError('쿠폰 목록을 불러오는데 실패했습니다.');
            }
        }

        // 쿠폰 목록 렌더링
        function renderCoupons() {
            const couponsList = document.getElementById('couponsList');
            
            if (filteredCoupons.length === 0) {
                couponsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🎫</div>
                        <div class="empty-title">등록된 쿠폰이 없습니다</div>
                        <div class="empty-text">새 쿠폰을 추가해보세요!</div>
                        <button class="add-btn" onclick="openModal('create')">
                            <span>➕</span>
                            새 쿠폰 추가
                        </button>
                    </div>
                `;
                return;
            }

            const couponsHtml = filteredCoupons.map(coupon => `
                <div class="coupon-item">
                    <div class="item-header">
                        <div class="item-main-info">
                            <div class="item-title">${coupon.couponName}</div>
                            <div class="item-description">쿠폰 ID: ${coupon.couponId}</div>
                            <div class="item-badges">
                                <span class="status-badge ${getStatusClass(coupon)}">${getStatusText(coupon)}</span>
                                <span class="policy-badge">${coupon.discountPolicyLabel}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="action-btn btn-view" onclick="viewCoupon(${coupon.couponId})">상세</button>
                            <button class="action-btn btn-edit" onclick="editCoupon(${coupon.couponId})">수정</button>
                            <button class="action-btn btn-delete" onclick="deleteCoupon(${coupon.couponId})">삭제</button>
                        </div>
                    </div>
                    
                    <div class="item-content">
                        <div class="item-details">
                            <div class="detail-row">
                                <div class="detail-icon">📅</div>
                                <div class="detail-content">
                                    <div class="detail-label">유효 기간</div>
                                    <div class="detail-value">${formatDate(coupon.couponStart)} ~ ${formatDate(coupon.couponEnd)}</div>
                                </div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-icon">🏷️</div>
                                <div class="detail-content">
                                    <div class="detail-label">할인 정책</div>
                                    <div class="detail-value">${coupon.discountPolicyLabel}</div>
                                </div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-icon">📊</div>
                                <div class="detail-content">
                                    <div class="detail-label">정책 코드</div>
                                    <div class="detail-value">${coupon.discountPolicy}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="item-meta">
                            <div class="meta-section">
                                <div class="meta-title">잔여 수량</div>
                                <div class="meta-value ${coupon.remainingQuantity === -1 ? 'quantity-unlimited' : 'quantity-limited'}">
                                    ${coupon.remainingQuantity === -1 ? '무제한' : coupon.remainingQuantity + '개'}
                                </div>
                            </div>
                            <div class="meta-section">
                                <div class="meta-title">쿠폰 상태</div>
                                <div class="meta-value">${getStatusText(coupon)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            couponsList.innerHTML = couponsHtml;
        }

        // 쿠폰 상태 클래스 반환
        function getStatusClass(coupon) {
            const now = new Date();
            const startDate = new Date(coupon.couponStart);
            const endDate = new Date(coupon.couponEnd);
            
            if (now < startDate) return 'status-upcoming';
            if (now > endDate) return 'status-expired';
            return 'status-active';
        }

        // 쿠폰 상태 텍스트 반환
        function getStatusText(coupon) {
            const now = new Date();
            const startDate = new Date(coupon.couponStart);
            const endDate = new Date(coupon.couponEnd);
            
            if (now < startDate) return '시작 예정';
            if (now > endDate) return '기간 만료';
            return '진행 중';
        }

        // 날짜 포맷팅
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        // 쿠폰 필터링
        function filterCoupons() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const policyFilter = document.getElementById('policyFilter').value;
            
            filteredCoupons = coupons.filter(coupon => {
                const matchesSearch = coupon.couponName.toLowerCase().includes(searchTerm);
                const matchesPolicy = !policyFilter || coupon.discountPolicy === policyFilter;
                
                return matchesSearch && matchesPolicy;
            });
            
            renderCoupons();
        }

        // 모달 열기
        function openModal(mode, couponId = null) {
            const modal = document.getElementById('couponModal');
            const modalTitle = document.getElementById('modalTitle');
            
            if (mode === 'create') {
                modalTitle.textContent = '새 쿠폰 추가';
                clearForm();
                currentEditId = null;
            } else if (mode === 'edit') {
                modalTitle.textContent = '쿠폰 수정';
                const coupon = coupons.find(c => c.couponId === couponId);
                if (coupon) {
                    fillForm(coupon);
                    currentEditId = couponId;
                }
            }
            
            modal.style.display = 'block';
        }

        // 모달 닫기
        function closeModal() {
            const modal = document.getElementById('couponModal');
            modal.style.display = 'none';
            clearForm();
            currentEditId = null;
        }

        // 폼 초기화
        function clearForm() {
            document.getElementById('couponForm').reset();
        }

        // 폼에 데이터 채우기
        function fillForm(coupon) {
            document.getElementById('couponName').value = coupon.couponName;
            document.getElementById('discountCode').value = coupon.discountPolicy;
            document.getElementById('remainingQuantity').value = coupon.remainingQuantity;
            document.getElementById('couponStart').value = coupon.couponStart;
            document.getElementById('couponEnd').value = coupon.couponEnd;
            document.getElementById('discountPolicyId').value = '1'; // 예시 값
        }

        // 쿠폰 저장
        async function saveCoupon() {
            try {
                const formData = {
                    couponName: document.getElementById('couponName').value,
                    discountCode: document.getElementById('discountCode').value,
                    remainingQuantity: parseInt(document.getElementById('remainingQuantity').value) || -1,
                    couponStart: document.getElementById('couponStart').value,
                    couponEnd: document.getElementById('couponEnd').value,
                    discountPolicyId: parseInt(document.getElementById('discountPolicyId').value)
                };

                // 유효성 검사
                if (!formData.couponName || !formData.discountCode || !formData.couponStart || !formData.couponEnd) {
                    alert('필수 정보를 모두 입력해주세요.');
                    return;
                }

                if (new Date(formData.couponStart) >= new Date(formData.couponEnd)) {
                    alert('종료일은 시작일보다 늦어야 합니다.');
                    return;
                }

                // 실제 API 호출
                const url = currentEditId ? `${API_BASE_URL}${COUPON_ENDPOINT}/${currentEditId}` : `${API_BASE_URL}${COUPON_ENDPOINT}`;
                const method = currentEditId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('쿠폰 저장에 실패했습니다.');
                }

                closeModal();
                await loadCoupons(); // 전체 목록 다시 로드
                alert(currentEditId ? '쿠폰이 수정되었습니다.' : '쿠폰이 추가되었습니다.');

            } catch (error) {
                console.error('Error saving coupon:', error);
                alert('쿠폰 저장에 실패했습니다.');
            }
        }

        // 정책 라벨 반환
        function getPolicyLabel(discountCode) {
            const labels = {
                'COUPON_FIXED': '(쿠폰) 금액 할인',
                'COUPON_PERCENT': '(쿠폰) 퍼센트 할인',
                'COUPON_FCFS': '선착순 전용 쿠폰'
            };
            return labels[discountCode] || '';
        }

        // 쿠폰 상세 보기
        function viewCoupon(couponId) {
            const coupon = coupons.find(c => c.couponId === couponId);
            if (coupon) {
                alert(`쿠폰 상세 정보:\n\n쿠폰명: ${coupon.couponName}\n할인 정책: ${coupon.discountPolicyLabel}\n잔여 수량: ${coupon.remainingQuantity === -1 ? '무제한' : coupon.remainingQuantity + '개'}\n유효 기간: ${formatDate(coupon.couponStart)} ~ ${formatDate(coupon.couponEnd)}`);
            }
        }

        // 쿠폰 수정
        function editCoupon(couponId) {
            openModal('edit', couponId);
        }

        // 쿠폰 삭제
        async function deleteCoupon(couponId) {
            if (!confirm('정말로 이 쿠폰을 삭제하시겠습니까?')) {
                return;
            }

            try {
                // 실제 API 호출
                const response = await fetch(`${API_BASE_URL}${COUPON_ENDPOINT}/${couponId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('쿠폰 삭제에 실패했습니다.');
                }

                await loadCoupons(); // 전체 목록 다시 로드
                alert('쿠폰이 삭제되었습니다.');

            } catch (error) {
                console.error('Error deleting coupon:', error);
                alert('쿠폰 삭제에 실패했습니다.');
            }
        }

        // 로딩 표시
        function showLoading() {
            const couponsList = document.getElementById('couponsList');
            couponsList.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>쿠폰 정보를 불러오는 중...</div>
                </div>
            `;
        }

        // 에러 표시
        function showError(message) {
            const couponsList = document.getElementById('couponsList');
            couponsList.innerHTML = `
                <div class="error-message">
                    ${message}
                </div>
            `;
        }

        // 모달 외부 클릭 시 닫기
        window.onclick = function(event) {
            const modal = document.getElementById('couponModal');
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