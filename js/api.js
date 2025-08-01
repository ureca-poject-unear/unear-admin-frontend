const API_CONFIG = {
    BASE_URL: 'http://localhost:8082',
    ENDPOINTS: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout'
    }
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
        const contentType = response.headers.get('content-type');

        let data = null;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }
        }

        return {
            success: response.ok && (data?.code === 'SUCCESS' || data?.codeName === 'SUCCESS' || data?.success === true),
            data: data?.data || data,
            message: data?.message || (response.ok ? '성공' : '요청 실패'),
            status: response.status,
            code: data?.code
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: '네트워크 오류가 발생했습니다.',
            status: 0
        };
    }
};
