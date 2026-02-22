import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Api, AdminMe, clearPendingRequests } from '../api'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AdminMe | null
  mustChangePassword: boolean
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  validateToken: () => Promise<boolean>
  setUser: (user: AdminMe | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_VALIDATION_KEY = 'auth_validation_state'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    mustChangePassword: false,
  })

  // Use ref to track validation state to avoid stale closures in callbacks
  const validatingRef = useRef(false)
  // Use ref to track if initial auth check has been done
  const initializedRef = useRef(false)

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (validatingRef.current) {
      console.log('[Auth] Already validating, skipping...')
      return false
    }

    validatingRef.current = true
    console.log('[Auth] Validating token...')
    
    try {
      const user = await Api.me()
      console.log('[Auth] Token valid, user:', user.username)
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        mustChangePassword: false,
      })
      // Store validation state in sessionStorage (not localStorage for security)
      sessionStorage.setItem(TOKEN_VALIDATION_KEY, 'valid')
      return true
    } catch (error: any) {
      console.log('[Auth] Token validation failed:', error?.message)
      const msg = String(error?.message || error)
      
      // If 401, try to refresh token
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.includes('expired')) {
        console.log('[Auth] Token expired/invalid, attempting refresh...')
        return false
      }
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        mustChangePassword: false,
      })
      sessionStorage.removeItem(TOKEN_VALIDATION_KEY)
      return false
    } finally {
      validatingRef.current = false
    }
  }, [])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (validatingRef.current) {
      console.log('[Auth] Already validating, waiting...')
      // Wait for current validation to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Then check if we're authenticated
      return false
    }
    
    console.log('[Auth] Attempting token refresh...')
    try {
      const result = await Api.refreshToken()
      console.log('[Auth] Token refreshed successfully')
      // After refresh, validate again
      return await validateToken()
    } catch (error: any) {
      console.log('[Auth] Token refresh failed:', error?.message)
      return false
    }
  }, [validateToken])

  const login = useCallback(async (username: string, password: string) => {
    console.log('[Auth] Logging in...')
    const result = await Api.login(username, password)
    
    // Note: JWT tokens are now in httpOnly cookies, so we don't need to store them in localStorage
    // The cookies are automatically sent with subsequent requests
    
    setState({
      isAuthenticated: true,
      isLoading: false,
      user: null, // Will be fetched in bootstrap
      mustChangePassword: result.must_change_password,
    })
    
    sessionStorage.setItem(TOKEN_VALIDATION_KEY, 'valid')
  }, [])

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out...')
    // Clear all pending requests before logout
    clearPendingRequests()
    try {
      await Api.logout()
    } catch (error) {
      console.log('[Auth] Logout API call failed, continuing with local logout')
    }
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      mustChangePassword: false,
    })
    
    sessionStorage.removeItem(TOKEN_VALIDATION_KEY)
  }, [])

  const setUser = useCallback((user: AdminMe | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }))
  }, [])

  // Session restoration on app initialization
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true
    
    const initAuth = async () => {
      console.log('[Auth] Initializing auth state...')
      
      // Check if we have a valid validation state from sessionStorage
      const wasValid = sessionStorage.getItem(TOKEN_VALIDATION_KEY) === 'valid'
      
      if (wasValid) {
        console.log('[Auth] Previous session was valid, validating...')
        // Try to validate the existing token (from cookie)
        const isValid = await validateToken()
        
        if (!isValid) {
          console.log('[Auth] Previous session invalid, trying refresh...')
          // Try to refresh the token
          const refreshed = await refreshToken()
          
          if (!refreshed) {
            console.log('[Auth] Refresh failed, user needs to login')
            setState(prev => ({
              ...prev,
              isLoading: false,
              isAuthenticated: false,
            }))
          }
        }
      } else {
        console.log('[Auth] No previous session, setting loading to false')
        setState(prev => ({
          ...prev,
          isLoading: false,
        }))
      }
    }
    
    initAuth()
  }, []) // Empty deps - run once on mount

  // Set up periodic token refresh
  useEffect(() => {
    if (!state.isAuthenticated) return
    
    // Refresh token every 10 minutes (before the 15-minute access token expires)
    const interval = setInterval(async () => {
      console.log('[Auth] Periodic token refresh check...')
      const refreshed = await refreshToken()
      if (!refreshed) {
        console.log('[Auth] Periodic refresh failed')
      }
    }, 10 * 60 * 1000) // 10 minutes
    
    return () => clearInterval(interval)
  }, [state.isAuthenticated, refreshToken])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshToken,
        validateToken,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
