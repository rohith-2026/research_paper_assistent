const ACCESS_TOKEN_KEY = "rpa_access_token";
const USER_KEY = "rpa_user";

export const storage = {
  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  setUser(user: unknown) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clearUser() {
    localStorage.removeItem(USER_KEY);
  },

  clearAll() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
