import { useSelector, useDispatch }  from 'react-redux'
import { useNavigate }               from 'react-router-dom'
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsCreator,
  selectIsTaker,
  clearCredentials,
}                                    from '../features/auth/authSlice.js'
import axiosInstance                 from '../api/axiosInstance.js'

/**
 * useAuth
 * Custom hook that gives any component clean access to auth state
 * and actions without needing to know about Redux internals.
 *
 * Usage:
 *   const { user, isAuthenticated, isCreator, logout } = useAuth()
 */
const useAuth = () => {
  const dispatch      = useDispatch()
  const navigate      = useNavigate()

  const user            = useSelector(selectCurrentUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading       = useSelector(selectIsLoading)
  const isCreator       = useSelector(selectIsCreator)
  const isTaker         = useSelector(selectIsTaker)

  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout')
    } catch {
      // Swallow error — we log out on client side regardless
    } finally {
      dispatch(clearCredentials())
      navigate('/login')
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    isCreator,
    isTaker,
    logout,
  }
}

export default useAuth