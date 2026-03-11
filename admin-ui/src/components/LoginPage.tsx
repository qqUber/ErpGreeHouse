import React, { useState } from 'react';
import { useAuth } from '../stores/auth';

export function LoginPage() {
  const { login } = useAuth();
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
      setError('Неверное имя пользователя или пароль');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ERP Greenhouse</h1>
          <p className="text-gray-600">Панель управления для вашего бизнеса</p>
        </div>

        {/* Login Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setLoginMode('password')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                loginMode === 'password'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              По паролю
            </button>
            <button
              onClick={() => setLoginMode('key')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                loginMode === 'key'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              По ключу
            </button>
            <button
              onClick={() => setLoginMode('recover')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                loginMode === 'recover'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Восстановление
            </button>
          </div>
        </div>

        {/* Password Login */}
        {loginMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="max-w-md mx-auto">
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Введите пароль"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? 'Скрыть' : 'Показать'}
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
              {loading ? 'Вход...' : 'Войти'}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Введите ключ доступа"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        )}

        {/* Recovery */}
        {loginMode === 'recover' && (
          <form onSubmit={handleRecovery} className="max-w-md mx-auto">
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">Новый пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Новый пароль"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Код восстановления
              </label>
              <input
                type="text"
                value={recoverySecret}
                onChange={(e) => setRecoverySecret(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Введите код восстановления"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Восстановление...' : 'Сбросить пароль'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
