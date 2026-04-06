import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Api } from '../api';

type Theme = 'light' | 'dark' | 'auto';
type Density = 'compact' | 'comfortable' | 'spacious';
type Locale = 'en' | 'ru' | 'srb';
type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';

interface UserPreferences {
  theme: Theme;
  density: Density;
  locale: Locale;
  sidebarCollapsed: boolean;
  dashboardLayout: Record<string, unknown>;
}

interface DashboardPreferences {
  widgets: {
    visible: string[];
    order: string[];
    layouts: Record<string, unknown>;
  };
  refreshInterval: number;
}

interface FeatureFlags {
  flags: Record<string, boolean>;
  tenantId: string;
  version: string;
}

interface UsePreferencesReturn {
  // User preferences
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;

  // Dashboard preferences
  dashboardPrefs: DashboardPreferences | null;
  updateDashboardPrefs: (prefs: Partial<DashboardPreferences>) => Promise<void>;

  // Feature flags
  featureFlags: FeatureFlags | null;
  isFeatureEnabled: (flag: string) => boolean;

  // Helper methods
  setTheme: (theme: Theme) => Promise<void>;
  setDensity: (density: Density) => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  toggleSidebar: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  density: 'comfortable',
  locale: 'en',
  sidebarCollapsed: false,
  dashboardLayout: {},
};

const DEFAULT_DASHBOARD_PREFS: DashboardPreferences = {
  widgets: {
    visible: [],
    order: [],
    layouts: {},
  },
  refreshInterval: 300,
};

export function usePreferences(): UsePreferencesReturn {
  const { i18n } = useTranslation();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPreferences | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preferencesQuery = useQuery({
    queryKey: ['user-preferences-bundle'],
    queryFn: async () => {
      const [userPrefs, dashPrefs, flags] = await Promise.all([
        Api.getUserPreferences().catch((err) => {
          console.warn('[usePreferences] Failed to load user preferences:', err);
          return null;
        }),
        Api.getDashboardPreferences().catch((err) => {
          console.warn('[usePreferences] Failed to load dashboard preferences:', err);
          return null;
        }),
        Api.getFeatureFlags().catch((err) => {
          console.warn('[usePreferences] Failed to load feature flags:', err);
          return null;
        }),
      ]);

      return {
        userPrefs,
        dashPrefs,
        flags,
      };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    if (preferencesQuery.data.userPrefs) {
      setPreferences(preferencesQuery.data.userPrefs.preferences);
    }
    if (preferencesQuery.data.dashPrefs) {
      setDashboardPrefs(preferencesQuery.data.dashPrefs);
    }
    if (preferencesQuery.data.flags) {
      setFeatureFlags(preferencesQuery.data.flags);
    }
  }, [preferencesQuery.data]);

  useEffect(() => {
    if (!preferencesQuery.error) {
      return;
    }
    setError(String(preferencesQuery.error));
  }, [preferencesQuery.error]);

  const updatePreferencesMutation = useMutation({
    mutationFn: (updated: UserPreferences) => Api.updateUserPreferences(updated),
  });
  const updateDashboardPrefsMutation = useMutation({
    mutationFn: (updated: DashboardPreferences) => Api.updateDashboardPreferences(updated),
  });

  const updatePreferences = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      try {
        const current = preferences || DEFAULT_PREFERENCES;
        const updated = { ...current, ...prefs };

        await updatePreferencesMutation.mutateAsync(updated);
        setPreferences(updated);
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [preferences, updatePreferencesMutation]
  );

  const updateDashboardPrefs = useCallback(
    async (prefs: Partial<DashboardPreferences>) => {
      try {
        const current = dashboardPrefs || DEFAULT_DASHBOARD_PREFS;
        const updated = { ...current, ...prefs };

        await updateDashboardPrefsMutation.mutateAsync(updated);
        setDashboardPrefs(updated);
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [dashboardPrefs, updateDashboardPrefsMutation]
  );

  const setTheme = useCallback(
    async (theme: Theme) => {
      await updatePreferences({ theme });
    },
    [updatePreferences]
  );

  const setDensity = useCallback(
    async (density: Density) => {
      await updatePreferences({ density });
    },
    [updatePreferences]
  );

  const setLocale = useCallback(
    async (locale: Locale) => {
      await updatePreferences({ locale });
      await i18n.changeLanguage(locale);
    },
    [updatePreferences, i18n]
  );

  const toggleSidebar = useCallback(async () => {
    const current = preferences || DEFAULT_PREFERENCES;
    await updatePreferences({ sidebarCollapsed: !current.sidebarCollapsed });
  }, [preferences, updatePreferences]);

  const isFeatureEnabled = useCallback(
    (flag: string): boolean => {
      if (!featureFlags?.flags) return false;
      return featureFlags.flags[flag] ?? false;
    },
    [featureFlags]
  );

  return {
    preferences,
    isLoading: preferencesQuery.isLoading,
    error,
    updatePreferences,
    dashboardPrefs,
    updateDashboardPrefs,
    featureFlags,
    isFeatureEnabled,
    setTheme,
    setDensity,
    setLocale,
    toggleSidebar,
    refresh: async () => {
      setError(null);
      await preferencesQuery.refetch();
    },
  };
}
