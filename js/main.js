const API_CONFIG = {
    BASE_URL: 'http://localhost:8082',
    ENDPOINTS: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        ADMIN_COUPONS: {
            BASE: '/admin/coupons',
            DETAIL: (id) => `/admin/coupons/${id}`,
        },
        ADMIN_EVENTS: {
            BASE: '/admin/events',
            POPUP: (eventId) => `/admin/events/${eventId}/places/popup`,
            NEARBY_PARTNERS: (eventId) => `/admin/events/${eventId}/partners/nearby`,
            REGISTER_PARTNERS: (eventId) => `/admin/events/${eventId}/partners`,
            COUPON: (eventId) => `/admin/events/${eventId}/coupon`,
        },
        ADMIN_PLACES: {
            BASE: '/admin/places',
            UPDATE: (placeId) => `/admin/places/${placeId}`,
            DELETE: '/admin/places',
            EVENT_RADIUS: (eventId) => `/admin/places/${eventId}/partners`,
        },
    },
};

const SessionManager = {
    set: (sessionInfo) => {
        localStorage.setItem('posSessionInfo', JSON.stringify(sessionInfo));
        sessionStorage.setItem('admin', JSON.stringify(sessionInfo));
    },
    get: () => {
        const stored = localStorage.getItem('posSessionInfo') || sessionStorage.getItem('admin');
        return stored ? JSON.parse(stored) : null;
    },
    clear: () => {
        localStorage.removeItem('posSessionInfo');
        sessionStorage.removeItem('admin');
    },
    isLoggedIn: () => SessionManager.get() !== null,
};

const apiCall = async (endpoint, options = {}) => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, mergedOptions);
        let data = null;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = JSON.parse(text || '{}');
        }

        return {
            success: response.ok && (data?.code === 'SUCCESS' || data?.success === true),
            data: data?.data || data,
            message: data?.message || (response.ok ? '성공' : '요청 실패'),
            status: response.status,
            code: data?.code,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: '네트워크 오류가 발생했습니다.',
            status: 0,
        };
    }
};

const navigateTo = (page) => {
    const routes = {
        dashboard: './dashboard.html',
        events: './events.html',
        coupons: './coupons.html',
        partners: './partners.html',
        settings: './settings.html',
    };

    if (routes[page]) {
        window.location.href = routes[page];
    } else {
        alert(`${page} 페이지는 준비 중입니다.`);
    }
};

const handleLogout = async () => {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
        try {
            await apiCall(API_CONFIG.ENDPOINTS.LOGOUT, { method: 'POST' });
        } catch (error) {
            console.error('로그아웃 오류:', error);
        } finally {
            SessionManager.clear();
            alert('로그아웃 되었습니다.');
            window.location.href = '../index.html';
        }
    }
};

const displayUserInfo = () => {
    const admin = SessionManager.get();
    if (admin) {
        const userName = admin.name || admin.email || '관리자';
        document.getElementById('welcomeMessage').textContent = `환영합니다, ${userName}님!`;
        document.getElementById('userName').textContent = userName;
        document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();
    }
};

const loadDashboardData = async () => {
    // 임시 샘플
    setTimeout(() => {
        document.getElementById('totalEvents').textContent = '12';
        document.getElementById('totalCoupons').textContent = '48';
        document.getElementById('totalPartners').textContent = '156';
    }, 800);
};

const initializePage = () => {
    if (!SessionManager.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = '../index.html';
        return;
    }
    displayUserInfo();
    loadDashboardData();

    document.querySelectorAll('.card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.1}s`;
    });
};

document.addEventListener('DOMContentLoaded', initializePage);
