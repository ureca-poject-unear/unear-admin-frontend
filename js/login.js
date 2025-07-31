document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const result = await apiCall(API_CONFIG.ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({
            email: username,
            password: password
        })
    });
    
    const errorDiv = document.getElementById('passwordError');
    
    if (result.success) {
        // 세션 정보 저장
        SessionManager.set(result.data);
        alert('로그인 성공!');
        window.location.href = "/html/main.html";
    } else {
        errorDiv.textContent = result.message || '로그인에 실패했습니다.';
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
});