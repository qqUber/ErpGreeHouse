import { useEffect, useState } from 'react';
import { Api } from '../api';

type TelegramStatus = {
  enabled: boolean;
  configured: boolean;
  bot_token_set: boolean;
  config: {
    bot_token?: string;
    enabled?: boolean;
  };
};

type VKStatus = {
  enabled: boolean;
  configured: boolean;
  group_id: number | null;
  api_version: string;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

export function IntegrationSettings() {
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [vkStatus, setVkStatus] = useState<VKStatus | null>(null);

  // Telegram form
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramValidateStatus, setTelegramValidateStatus] = useState<Status>('idle');
  const [telegramValidationResult, setTelegramValidationResult] = useState<any>(null);
  const [telegramSaveStatus, setTelegramSaveStatus] = useState<Status>('idle');

  // VK form
  const [vkToken, setVkToken] = useState('');
  const [vkGroupId, setVkGroupId] = useState('');
  const [vkApiVersion, setVkApiVersion] = useState('5.131');
  const [vkEnabled, setVkEnabled] = useState(false);
  const [vkValidateStatus, setVkValidateStatus] = useState<Status>('idle');
  const [vkValidationResult, setVkValidationResult] = useState<any>(null);
  const [vkSaveStatus, setVkSaveStatus] = useState<Status>('idle');

  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const status = await Api.getIntegrationsStatus();
      setTelegramStatus(status.telegram);
      setVkStatus(status.vk);

      // Pre-fill form with existing values
      if (status.telegram.config?.bot_token) {
        setTelegramToken(status.telegram.config.bot_token);
      }
      if (status.telegram.config?.enabled !== undefined) {
        setTelegramEnabled(status.telegram.config.enabled);
      }
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  }

  async function validateTelegram() {
    if (!telegramToken.trim()) {
      setInfo('Введите токен бота');
      return;
    }

    setTelegramValidateStatus('loading');
    setTelegramValidationResult(null);

    try {
      const result = await Api.validateTelegramToken(telegramToken.trim(), telegramEnabled);
      setTelegramValidationResult(result);
      setTelegramValidateStatus(result.valid ? 'success' : 'error');
    } catch (e: any) {
      setTelegramValidationResult({ error: String(e) });
      setTelegramValidateStatus('error');
    }
  }

  async function saveTelegram() {
    if (!telegramToken.trim()) {
      setInfo('Введите токен бота');
      return;
    }

    setTelegramSaveStatus('loading');

    try {
      await Api.saveTelegramSettings(telegramToken.trim(), telegramEnabled);
      setTelegramSaveStatus('success');
      setInfo('Настройки Telegram сохранены');
      await loadStatus();
    } catch (e: any) {
      setTelegramSaveStatus('error');
      setInfo(`Ошибка сохранения: ${e.message || e}`);
    }
  }

  async function setupTelegramWebhook() {
    try {
      const result = await Api.setTelegramWebhook();
      setInfo(`Webhook установлен: ${result.url}`);
    } catch (e: any) {
      setInfo(`Ошибка установки webhook: ${e.message || e}`);
    }
  }

  async function validateVk() {
    if (!vkToken.trim()) {
      setInfo('Введите токен VK');
      return;
    }
    if (!vkGroupId.trim()) {
      setInfo('Введите ID группы VK');
      return;
    }

    setVkValidateStatus('loading');
    setVkValidationResult(null);

    try {
      const result = await Api.validateVkToken(
        vkToken.trim(),
        parseInt(vkGroupId, 10),
        vkApiVersion,
        vkEnabled
      );
      setVkValidationResult(result);
      setVkValidateStatus(result.valid ? 'success' : 'error');
    } catch (e: any) {
      setVkValidationResult({ error: String(e) });
      setVkValidateStatus('error');
    }
  }

  async function saveVk() {
    if (!vkToken.trim()) {
      setInfo('Введите токен VK');
      return;
    }
    if (!vkGroupId.trim()) {
      setInfo('Введите ID группы VK');
      return;
    }

    setVkSaveStatus('loading');

    try {
      await Api.saveVkSettings(vkToken.trim(), parseInt(vkGroupId, 10), vkApiVersion, vkEnabled);
      setVkSaveStatus('success');
      setInfo('Настройки VK сохранены');
      await loadStatus();
    } catch (e: any) {
      setVkSaveStatus('error');
      setInfo(`Ошибка сохранения: ${e.message || e}`);
    }
  }

  async function setupVkWebhook() {
    try {
      const result = await Api.setVkWebhook();
      setInfo(`Webhook настроен: ${result.url}`);
    } catch (e: any) {
      setInfo(`Ошибка настройки webhook: ${e.message || e}`);
    }
  }

  function getStatusBadge(status: Status) {
    switch (status) {
      case 'loading':
        return <span className="pill pillWarn">Загрузка...</span>;
      case 'success':
        return <span className="pill pillGood">Успешно</span>;
      case 'error':
        return <span className="pill pillErr">Ошибка</span>;
      default:
        return null;
    }
  }

  return (
    <div className="grid">
      {info && (
        <div
          className="card"
          style={{ backgroundColor: 'var(--info-bg)', padding: '10px', marginBottom: 10 }}
        >
          {info}
          <button
            onClick={() => setInfo(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Telegram Section */}
      <div className="card cardWide">
        <div className="row" style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✈️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Telegram</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {telegramStatus?.enabled ? 'Подключено' : 'Не подключено'}
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
              />
              Включить
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Bot Token</div>
            <input
              className="input"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn"
              onClick={validateTelegram}
              disabled={telegramValidateStatus === 'loading' || !telegramToken.trim()}
            >
              Проверить токен
            </button>
            {getStatusBadge(telegramValidateStatus)}
            {telegramValidationResult && (
              <span
                style={{ fontSize: 12, color: telegramValidationResult.valid ? 'green' : 'red' }}
              >
                {telegramValidationResult.valid
                  ? `@${telegramValidationResult.bot_username} (ID: ${telegramValidationResult.bot_id})`
                  : telegramValidationResult.error || 'Ошибка'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btnPrimary"
              onClick={saveTelegram}
              disabled={telegramSaveStatus === 'loading'}
            >
              Сохранить
            </button>
            {getStatusBadge(telegramSaveStatus)}
            <button className="btn" onClick={setupTelegramWebhook}>
              Настроить Webhook
            </button>
          </div>
        </div>
      </div>

      {/* VK Section */}
      <div className="card cardWide">
        <div className="row" style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📱</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>VK (VKontakte)</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {vkStatus?.enabled ? 'Подключено' : 'Не подключено'}
                {vkStatus?.group_id && ` • Группа ID: ${vkStatus.group_id}`}
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={vkEnabled}
                onChange={(e) => setVkEnabled(e.target.checked)}
              />
              Включить
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Group ID</div>
              <input
                className="input"
                value={vkGroupId}
                onChange={(e) => setVkGroupId(e.target.value)}
                placeholder="123456789"
                type="number"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>API Version</div>
              <input
                className="input"
                value={vkApiVersion}
                onChange={(e) => setVkApiVersion(e.target.value)}
                placeholder="5.131"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Access Token</div>
            <input
              className="input"
              value={vkToken}
              onChange={(e) => setVkToken(e.target.value)}
              placeholder="vk1.a.XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn"
              onClick={validateVk}
              disabled={vkValidateStatus === 'loading' || !vkToken.trim() || !vkGroupId.trim()}
            >
              Проверить токен
            </button>
            {getStatusBadge(vkValidateStatus)}
            {vkValidationResult && (
              <span style={{ fontSize: 12, color: vkValidationResult.valid ? 'green' : 'red' }}>
                {vkValidationResult.valid
                  ? `${vkValidationResult.group_name} (ID: ${vkValidationResult.group_id})`
                  : vkValidationResult.error || 'Ошибка'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btnPrimary"
              onClick={saveVk}
              disabled={vkSaveStatus === 'loading'}
            >
              Сохранить
            </button>
            {getStatusBadge(vkSaveStatus)}
            <button className="btn" onClick={setupVkWebhook}>
              Настроить Webhook
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Инструкции по настройке</div>

        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <div style={{ marginBottom: 15 }}>
            <strong>Telegram:</strong>
            <ol style={{ marginTop: 5, paddingLeft: 20 }}>
              <li>Создайте бота через @BotFather в Telegram</li>
              <li>Скопируйте токен бота (формат: 1234567890:ABC...)</li>
              <li>Вставьте токен в поле выше и нажмите "Проверить токен"</li>
              <li>После успешной проверки нажмите "Сохранить"</li>
              <li>Нажмите "Настроить Webhook" для установки webhook</li>
            </ol>
          </div>

          <div>
            <strong>VK (VKontakte):</strong>
            <ol style={{ marginTop: 5, paddingLeft: 20 }}>
              <li>Создайте сообщество (группу) в VK</li>
              <li>Перейдите в "Управление" → "Работа с API"</li>
              <li>Создайте ключ доступа с правами "messages"</li>
              <li>Скопируйте ID группы (можно найти в URL группы)</li>
              <li>Вставьте токен и ID группы выше, нажмите "Проверить токен"</li>
              <li>После успешной проверки нажмите "Сохранить"</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
