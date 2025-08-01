const showError = (elementId, message) => {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
    setTimeout(() => errorElement.classList.remove('show'), 4000);
};

const setLoading = (isLoading) => {
    const loginButton = document.getElementById('loginButton');
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (isLoading) {
        loginButton.classList.add('loading');
        loginButton.disabled = true;
        loginButton.querySelector('.btn-text').textContent = '로그인 중...';
        loadingOverlay.style.display = 'flex';
    } else {
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
        loginButton.querySelector('.btn-text').textContent = '로그인';
        loadingOverlay.style.display = 'none';
    }
};

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!email) return showError('usernameError', '이메일을 입력해주세요.');
    if (!password) return showError('passwordError', '비밀번호를 입력해주세요.');

    setLoading(true);

    try {
        const result = await apiCall(API_CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        if (result.success) {
            SessionManager.set(result.data);
            alert('로그인 성공!');
            window.location.href = 'html/main.html';
        } else {
            showError('passwordError', result.message || '로그인에 실패했습니다.');
        }
    } catch (error) {
        showError('passwordError', '서버 연결에 실패했습니다.');
    } finally {
        setLoading(false);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (SessionManager.isLoggedIn()) {
        console.log('이미 로그인된 사용자');
        // window.location.href = 'html/main.html';
    }
});

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});
