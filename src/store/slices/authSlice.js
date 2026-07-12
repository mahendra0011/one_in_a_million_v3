import { createSlice } from '@reduxjs/toolkit';

// Cookie-based auth — no localStorage for tokens
// Only persist non-sensitive user info (name, role, etc.) for UI display
const loadAuthState = () => {
  try {
    const user = JSON.parse(localStorage.getItem('bim_user') || 'null');
    if (user) return { user, isLoggedIn: true };
  } catch {}
  return { user: null, isLoggedIn: false };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuthState(),
  reducers: {
    loginSuccess(state, action) {
      const { user } = action.payload; // No token — server sets HttpOnly cookie
      state.user = user;
      state.isLoggedIn = true;
      localStorage.setItem('bim_user', JSON.stringify(user));
    },
    logout(state) {
      state.user = null;
      state.isLoggedIn = false;
      localStorage.removeItem('bim_user');
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('bim_user', JSON.stringify(state.user));
    },
  },
});

export const { loginSuccess, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
