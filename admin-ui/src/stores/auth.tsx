import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AdminMe, Api, clearPendingRequests } from '../api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminMe | null;
  mustChangePassword: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  validateToken: () => Promise<boolean>;
  setUser: (user: AdminMe | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_VALIDATION_KEY = 'auth_validation_state';

type LoginResult = {
  user: AdminMe | null;
  mustChangePassword: boolean;
};

type AuthContextState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AdminMe | null;
  mustChangePassword: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  const [state, setState] = useState<AuthContextState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    mustChangePassword: false,
  });

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await Api.me();
      return user;
    },
    enabled: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const refreshTokenMutation = useMutation({
    mutationFn: () => Api.refreshToken(),
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const result = await Api.login(username, password);
      let user: AdminMe | null = null;
      try {
        user = await Api.me();
      } catch (e) {
        console.error('[Auth] Login successful but failed to fetch user:', e);
      }
      return { user, mustChangePassword: result.must_change_password };
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearPendingRequests();
      try {
        await Api.logout();
      } catch (error) {
        // Logout API call failed, continuing with local logout
      }
    },
  });

  const setUser = useCallback(
    (user: AdminMe | null) => {
      setState((prev) => ({
        ...prev,
        user,
        isAuthenticated: !!user,
        isLoading: false,
      }));
      if (user) {
        queryClient.setQueryData(['auth', 'me'], user);
      } else {
        queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      }
    },
    [queryClient]
  );

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      const result = await meQuery.refetch();
      if (result.data) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: result.data,
          mustChangePassword: false,
        });
        sessionStorage.setItem(TOKEN_VALIDATION_KEY, 'valid');
        return true;
      }
      return false;
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (
        msg.includes('401') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.includes('expired')
      ) {
        return false;
      }
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        mustChangePassword: false,
      });
      sessionStorage.removeItem(TOKEN_VALIDATION_KEY);
      return false;
    }
  }, [meQuery]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      await refreshTokenMutation.mutateAsync();
      return await validateToken();
    } catch {
      return false;
    }
  }, [refreshTokenMutation, validateToken]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginMutation.mutateAsync({ username, password });
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: result.user,
        mustChangePassword: result.mustChangePassword,
      });
      if (result.user) {
        queryClient.setQueryData(['auth', 'me'], result.user);
      }
      sessionStorage.setItem(TOKEN_VALIDATION_KEY, 'valid');
    },
    [loginMutation, queryClient]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    queryClient.clear();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      mustChangePassword: false,
    });
    sessionStorage.removeItem(TOKEN_VALIDATION_KEY);
  }, [logoutMutation, queryClient]);

  // Session restoration on app initialization
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const initAuth = async () => {
      // Check if we have a valid validation state from sessionStorage
      const wasValid = sessionStorage.getItem(TOKEN_VALIDATION_KEY) === 'valid';

      if (wasValid) {
        // Try to validate the existing token (from cookie)
        const isValid = await validateToken();

        if (!isValid) {
          // Try to refresh the token
          const refreshed = await refreshToken();

          if (!refreshed) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              isAuthenticated: false,
            }));
          }
        }
      } else {
        // No previous session - user needs to login
        // Explicitly set isAuthenticated to false
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
        }));
      }
    };

    initAuth();
  }, []); // Empty deps - run once on mount

  // Set up periodic token refresh
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Refresh token every 10 minutes (before the 15-minute access token expires)
    const interval = setInterval(
      async () => {
        const refreshed = await refreshToken();
      },
      10 * 60 * 1000
    ); // 10 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshToken]);

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
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
