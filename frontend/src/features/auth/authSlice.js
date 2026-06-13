import { createSlice } from '@reduxjs/toolkit'

/* ── Initial state ──────────────────────────────────────────────────
   accessToken lives ONLY in memory (Redux).
   Never written to localStorage — safe from XSS.
   On page refresh it is gone — the axiosInstance refresh
   interceptor calls /auth/refresh to get a new one via cookie.
─────────────────────────────────────────────────────────────────── */
const initialState = {
  accessToken: null,
  user:        null,    // { id, username, email, role }
  isLoading:   true,    // true until we know if the user is logged in
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {

    /* ── Called after login or token refresh ────────────────────
       Merges new token and/or user into state.
       Pass only what changed — e.g. { accessToken } on refresh,
       or { accessToken, user } on login.                      ── */
    setCredentials: (state, action) => {
      const { accessToken, user } = action.payload
      if (accessToken) state.accessToken = accessToken
      if (user)        state.user        = user
      state.isLoading = false
    },

    /* ── Called on logout or when refresh fails ─────────────── */
    clearCredentials: (state) => {
      state.accessToken = null
      state.user        = null
      state.isLoading   = false
    },

    /* ── Called once on app boot ─────────────────────────────── */
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
  },
})

export const { setCredentials, clearCredentials, setLoading } = authSlice.actions

/* ── Selectors ──────────────────────────────────────────────────── */
export const selectCurrentUser        = (state) => state.auth.user
export const selectAccessToken        = (state) => state.auth.accessToken
export const selectIsAuthenticated    = (state) => !!state.auth.accessToken
export const selectIsLoading          = (state) => state.auth.isLoading
export const selectIsCreator          = (state) => state.auth.user?.role === 'creator'
export const selectIsTaker            = (state) => state.auth.user?.role === 'taker'

export default authSlice.reducer