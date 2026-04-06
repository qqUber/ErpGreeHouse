import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/auth';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'key' | 'recover'>('password');
  const [adminKey, setAdminKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoverySecret, setRecoverySecret] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // TODO: Implement key login
    setLoading(false);
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // TODO: Implement recovery
    setLoading(false);
  };

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="login-card bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('app.brand')}</h1>
          <p className="text-gray-600">{t('app.controlPanel')}</p>
        </div>

        {/* Login Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="login-tabs inline-flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setLoginMode('password')}
              className={`login-tab-btn px-6 py-2 rounded-md font-medium transition-all ${
                loginMode === 'password'
                  ? 'login-tab-btn-active bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('auth.byPassword')}
            </button>
            <button
              onClick={() => setLoginMode('key')}
              className={`login-tab-btn px-6 py-2 rounded-md font-medium transition-all ${
                loginMode === 'key'
                  ? 'login-tab-btn-active bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('auth.byKey')}
            </button>
            <button
              onClick={() => setLoginMode('recover')}
              className={`login-tab-btn px-6 py-2 rounded-md font-medium transition-all ${
                loginMode === 'recover'
                  ? 'login-tab-btn-active bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('auth.recovery')}
            </button>
          </div>
        </div>

        {/* Password Login */}
        {loginMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="max-w-md mx-auto">
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t('auth.loginPlaceholder')}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>
        )}

        {/* Key Login */}
        {loginMode === 'key' && (
          <form onSubmit={handleKeyLogin} className="max-w-md mx-auto">
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                x-admin-secret
              </label>
              <input
                type="text"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="login-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t('auth.accessSettings')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>
        )}

        {/* Recovery */}
        {loginMode === 'recover' && (
          <form onSubmit={handleRecovery} className="max-w-md mx-auto">
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t('auth.loginPlaceholder')}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                {t('auth.newPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="login-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('auth.newPasswordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                {t('auth.recoveryCode')}
              </label>
              <input
                type="text"
                value={recoverySecret}
                onChange={(e) => setRecoverySecret(e.target.value)}
                className="login-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t('auth.recoveryCode')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t('common.loading') : t('auth.resetPassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
