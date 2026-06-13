import axios from 'axios'
import { store }           from '../app/store.js'
import { setCredentials, clearCredentials } from '../features/auth/authSlice.js'

/* ── Base instance ──────────────────────────────────────────────────
   All API calls go through this instance.
   VITE_API_URL is set in frontend/.env as:
     VITE_API_URL=http://localhost:5000/api              (dev)
     VITE_API_URL=https://your-backend.onrender.com/api (prod)
─────────────────────────────────────────────────────────────────── */
const axiosInstance = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,   // sends the HttpOnly refresh token cookie automatically
  headers: { 'Content-Type': 'application/json' },
})

/* ── Request interceptor ────────────────────────────────────────────
   Automatically attaches the access token to every outgoing request.
   The token lives in Redux memory — never in localStorage.
─────────────────────────────────────────────────────────────────── */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/* ── Response interceptor ───────────────────────────────────────────
   When any request returns 401 (token expired):
   1. Call /auth/refresh — browser sends the HttpOnly cookie automatically
   2. Store the new access token in Redux
   3. Retry the original failed request with the new token
   4. If refresh also fails → log the user out
─────────────────────────────────────────────────────────────────── */
let isRefreshing  = false
let failedQueue   = []    // queue of requests waiting for the refresh to finish

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => response,   // pass through successful responses untouched

  async (error) => {
    const originalRequest = error.config

    /* ── Skip refresh logic if:
       - Error is not 401
       - Request has already been retried (_retry flag)
       - Request IS the refresh endpoint itself (avoid infinite loop)  ── */
    if (
      error.response?.status !== 401      ||
      originalRequest._retry              ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    /* ── If a refresh is already in progress, queue this request ── */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return axiosInstance(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    /* ── Start refresh ─────────────────────────────────────────── */
    originalRequest._retry = true
    isRefreshing            = true

    try {
      // withCredentials sends the HttpOnly cookie automatically
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
        {},
        { withCredentials: true }
      )

      const newToken = data.accessToken

      // Save new access token to Redux
      store.dispatch(setCredentials({ accessToken: newToken }))

      // Update the Authorization header for future requests
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      // Resolve all queued requests with the new token
      processQueue(null, newToken)

      // Retry the original failed request
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`
      return axiosInstance(originalRequest)

    } catch (refreshError) {
      // Refresh failed — session is truly expired, log out
      processQueue(refreshError, null)
      store.dispatch(clearCredentials())
      // Redirect to login — use window.location so Router doesn't need to be imported here
      window.location.href = '/login'
      return Promise.reject(refreshError)

    } finally {
      isRefreshing = false
    }
  }
)

export default axiosInstance