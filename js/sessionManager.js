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

    isLoggedIn: () => {
        return SessionManager.get() !== null;
    }
};
