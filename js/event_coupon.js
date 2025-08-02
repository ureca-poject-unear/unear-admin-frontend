        // 현재 날짜 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('couponStart').value = today;
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('couponEnd').value = nextWeek.toISOString().split('T')[0];

        // 폼 요소들
        const form = document.getElementById('couponForm');
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');

        // 실시간 미리보기 업데이트
        function updatePreview() {
            const couponName = document.getElementById('couponName').value || '쿠폰명을 입력해주세요';
            const quantity = document.getElementById('remainingQuantity').value || '0';
            const discountPolicy = document.getElementById('discountPolicyId');
            const membershipCode = document.getElementById('membershipCode');
            
            document.getElementById('previewName').textContent = couponName;
            document.getElementById('previewQuantity').textContent = quantity;
            document.getElementById('previewQuantityText').textContent = quantity + '개';
            
            // 할인 정책 표시
            const discountText = discountPolicy.options[discountPolicy.selectedIndex]?.text || '-';
            document.getElementById('previewDiscount').textContent = discountText;
            
            // 팝업스토어 전용으로 고정
            document.getElementById('previewPlace').textContent = '팝업스토어 전용';
            
            // 회원 등급 표시
            const gradeText = membershipCode.options[membershipCode.selectedIndex]?.text || '전체';
            document.getElementById('previewGrade').textContent = gradeText;
            
            // 사용 가능 일수 계산
            const startDate = new Date(document.getElementById('couponStart').value);
            const endDate = new Date(document.getElementById('couponEnd').value);
            const diffTime = endDate - startDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            document.getElementById('previewDays').textContent = diffDays > 0 ? diffDays : 0;
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

        // 폼 초기화
        function resetForm() {
            if (confirm('입력한 내용이 모두 삭제됩니다. 계속하시겠습니까?')) {
                form.reset();
                document.getElementById('couponStart').value = today;
                document.getElementById('couponEnd').value = nextWeek.toISOString().split('T')[0];
                document.getElementById('remainingQuantity').value = 100;
                updatePreview();
            }
        }

        // 뒤로가기
        function goBack() {
            if (confirm('작성 중인 내용이 있습니다. 페이지를 나가시겠습니까?')) {
                window.history.back();
            }
        }

        // 에러 메시지 표시
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        // 성공 메시지 표시
        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        }

        // 폼 제출 처리
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 버튼 비활성화 및 로딩 표시
            submitBtn.disabled = true;
            submitText.style.display = 'none';
            submitSpinner.style.display = 'inline-block';
            
            try {
                // URL에서 이벤트 ID 추출 (실제 구현시)
                const eventId = new URLSearchParams(window.location.search).get('eventId') || '1';
                
                // 폼 데이터 수집
                const formData = new FormData(form);
                const couponData = {
                    couponName: formData.get('couponName') || document.getElementById('couponName').value,
                    discountPolicyId: parseInt(document.getElementById('discountPolicyId').value),
                    remainingQuantity: parseInt(document.getElementById('remainingQuantity').value),
                    couponStart: document.getElementById('couponStart').value,
                    couponEnd: document.getElementById('couponEnd').value,
                    discountCode: 'COUPON_FCFS', // 선착순 쿠폰 고정값
                    markerCode: null, // 팝업스토어 전용이므로 별도 장소 제한 없음
                    membershipCode: document.getElementById('membershipCode').value || null
                };

                // 유효성 검사
                if (!couponData.couponName) {
                    throw new Error('쿠폰명을 입력해주세요.');
                }
                if (!couponData.discountPolicyId) {
                    throw new Error('할인 정책을 선택해주세요.');
                }
                if (couponData.remainingQuantity < 1 || couponData.remainingQuantity > 10000) {
                    throw new Error('발급 수량은 1~10,000개 사이여야 합니다.');
                }

                const startDate = new Date(couponData.couponStart);
                const endDate = new Date(couponData.couponEnd);
                if (endDate <= startDate) {
                    throw new Error('종료일은 시작일보다 뒤여야 합니다.');
                }

                // API 호출 시뮬레이션 (실제 구현시 주석 해제)
                /*
                const response = await fetch(`/admin/events/${eventId}/coupon`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(couponData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '쿠폰 생성에 실패했습니다.');
                }
                */

                // 성공 시뮬레이션
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                showSuccess('선착순 쿠폰이 성공적으로 생성되었습니다!');
                
                // 3초 후 리다이렉트 (실제 구현시)
                setTimeout(() => {
                    // window.location.href = `/admin/events/${eventId}`;
                    console.log('리다이렉트 시뮬레이션');
                }, 2000);
                
            } catch (error) {
                console.error('쿠폰 생성 오류:', error);
                showError(error.message || '쿠폰 생성 중 오류가 발생했습니다.');
            } finally {
                // 버튼 상태 복원
                submitBtn.disabled = false;
                submitText.style.display = 'inline';
                submitSpinner.style.display = 'none';
            }
        });

        // 실시간 미리보기 이벤트 리스너
        document.getElementById('couponName').addEventListener('input', updatePreview);
        document.getElementById('remainingQuantity').addEventListener('input', updatePreview);
        document.getElementById('discountPolicyId').addEventListener('change', updatePreview);
        document.getElementById('markerCode').addEventListener('change', updatePreview);
        document.getElementById('membershipCode').addEventListener('change', updatePreview);
        document.getElementById('couponStart').addEventListener('change', updatePreview);
        document.getElementById('couponEnd').addEventListener('change', updatePreview);

        // 날짜 유효성 검사
        document.getElementById('couponStart').addEventListener('change', function() {
            const startDate = this.value;
            const endDateInput = document.getElementById('couponEnd');
            endDateInput.min = startDate;
            
            if (endDateInput.value && endDateInput.value <= startDate) {
                const nextDay = new Date(startDate);
                nextDay.setDate(nextDay.getDate() + 1);
                endDateInput.value = nextDay.toISOString().split('T')[0];
            }
            updatePreview();
        });

        // 수량 입력 유효성 검사
        document.getElementById('remainingQuantity').addEventListener('input', function() {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) {
                this.value = 1;
            } else if (value > 10000) {
                this.value = 10000;
            }
            updatePreview();
        });

        // 쿠폰명 길이 제한
        document.getElementById('couponName').addEventListener('input', function() {
            if (this.value.length > 50) {
                this.value = this.value.substring(0, 50);
            }
        });

        // 페이지 로드시 초기 미리보기 업데이트
        updatePreview();

        // 페이지 나가기 전 확인
        window.addEventListener('beforeunload', function(e) {
            const form = document.getElementById('couponForm');
            const formData = new FormData(form);
            let hasData = false;
            
            for (let [key, value] of formData.entries()) {
                if (value && key !== 'couponStart' && key !== 'couponEnd') {
                    hasData = true;
                    break;
                }
            }
            
            if (hasData) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // 키보드 단축키
        document.addEventListener('keydown', function(e) {
            // Ctrl+S로 저장
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
            
            // ESC로 초기화 확인
            if (e.key === 'Escape') {
                if (confirm('폼을 초기화하시겠습니까?')) {
                    resetForm();
                }
            }
        });

        // 툴팁 기능 (선택적)
        function addTooltip(element, text) {
            element.title = text;
            element.style.cursor = 'help';
        }

        // 할인 정책 설명 툴팁 추가
        addTooltip(document.querySelector('label[for="discountPolicyId"]'), 
                  '사전에 설정된 할인 정책 중에서 선택할 수 있습니다.');
        
        addTooltip(document.querySelector('label[for="markerCode"]'), 
                  '특정 장소에서만 사용 가능하도록 제한할 수 있습니다.');
        
        addTooltip(document.querySelector('label[for="membershipCode"]'), 
                  '특정 회원 등급 이상만 사용 가능하도록 제한할 수 있습니다.');

        // 애니메이션 효과
        function animateSuccess() {
            const preview = document.querySelector('.coupon-preview');
            preview.style.transform = 'scale(1.05)';
            preview.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                preview.style.transform = 'scale(1)';
            }, 300);
        }

        // 성공 시 애니메이션 실행
        const originalShowSuccess = showSuccess;
        showSuccess = function(message) {
            originalShowSuccess(message);
            animateSuccess();
        };