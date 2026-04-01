import { ChangeEvent, DragEvent, useEffect, useState } from 'react';
import { Api } from '../api';

type TelegramMenuItemConfig = {
  id: string;
  label: string;
  text: string;
  media_urls: string[];
  button_text: string;
  button_url: string;
  use_text: boolean;
  use_media: boolean;
  use_button: boolean;
  use_city_list: boolean;
  use_support_forward: boolean;
  city_entries: TelegramCityEntry[];
};

type TelegramCityEntry = {
  city: string;
  text: string;
  media_urls: string[];
  button_text: string;
  button_url: string;
};

type TelegramStatus = {
  enabled: boolean;
  configured: boolean;
  bot_token_set: boolean;
  config: {
    bot_token?: string;
    enabled?: boolean;
    menu_items?: Array<{
      id: string;
      label: string;
      text?: string;
      media_urls?: string[];
      button_text?: string;
      button_url?: string;
      use_text?: boolean;
      use_media?: boolean;
      use_button?: boolean;
      use_city_list?: boolean;
      use_support_forward?: boolean;
      city_entries?: Array<{
        city: string;
        text?: string;
        media_urls?: string[];
        button_text?: string;
        button_url?: string;
      }>;
    }>;
    support_chat_id?: string;
  };
};

type VKStatus = {
  enabled: boolean;
  configured: boolean;
  group_id: number | null;
  api_version: string;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

// Menu item definitions with available template variables documentation
const TELEGRAM_MENU_DEFINITIONS = [
  {
    id: 'balance_card',
    label: 'Баланс и карта',
    description: 'Баланс, QR и дополнительные медиа',
    availableVars: [
      '{qr_token}',
      '{customer_id}',
      '{full_name}',
      '{balance}',
      '{bonus_balance}',
      '{total_purchases}',
      '{loyalty_level}',
    ],
  },
  {
    id: 'menu_addresses',
    label: 'Меню и адреса',
    description: 'Меню, адреса и кнопка перехода',
    availableVars: ['{city}'], // City-based content
  },
  {
    id: 'open_coffee_shop',
    label: 'Открыть кофейню',
    description: 'Запуск приложения или каталога',
    availableVars: [], // No variables, just media/video
  },
  {
    id: 'ask_question',
    label: 'Задать вопрос',
    description: 'Сообщение для связи с клиентом',
    availableVars: [], // Static text only
  },
  {
    id: 'leave_feedback',
    label: 'Оставить отзыв',
    description: 'Сообщение для сбора отзывов',
    availableVars: [], // Static text only
  },
  {
    id: 'vacancies',
    label: 'Вакансии',
    description: 'Текст и медиа про вакансии',
    availableVars: [], // Static text only
  },
  {
    id: 'about_club',
    label: 'Что такое клуб Green House?',
    description: 'Описание клуба и преимуществ',
    availableVars: [], // Static text only
  },
] as const;

// Fallback function for when database doesn't have menu items
function getDefaultTelegramMenuItems(): TelegramMenuItemConfig[] {
  return TELEGRAM_MENU_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    text: '',
    media_urls: [],
    button_text: '',
    button_url: '',
    use_text: definition.id !== 'open_coffee_shop',
    use_media: false,
    use_button: definition.id === 'menu_addresses',
    use_city_list: definition.id === 'menu_addresses',
    use_support_forward: definition.id === 'ask_question',
    city_entries: [],
  }));
}

// Dynamic function that uses database items with fallback to defaults
function mapTelegramMenuItems(
  menuItems?: TelegramStatus['config']['menu_items']
): TelegramMenuItemConfig[] {
  // If no menu items from database, use defaults
  if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
    return getDefaultTelegramMenuItems();
  }

  // Map database items to config format
  return menuItems.map((item) => ({
    id: item.id || 'unknown',
    label: item.label || item.id || 'Unknown',
    text: item.text || '',
    media_urls: Array.isArray(item.media_urls) ? item.media_urls.filter(Boolean) : [],
    button_text: item.button_text || '',
    button_url: item.button_url || '',
    use_text: item.use_text ?? true,
    use_media: item.use_media ?? false,
    use_button: item.use_button ?? false,
    use_city_list: item.use_city_list ?? false,
    use_support_forward: item.use_support_forward ?? false,
    city_entries: Array.isArray(item.city_entries)
      ? item.city_entries
          .filter((entry) => entry.city)
          .map((entry) => ({
            city: entry.city || '',
            text: entry.text || '',
            media_urls: Array.isArray(entry.media_urls) ? entry.media_urls.filter(Boolean) : [],
            button_text: entry.button_text || '',
            button_url: entry.button_url || '',
          }))
      : [],
  }));
}

function serializeTelegramMenuItems(menuItems: TelegramMenuItemConfig[]): Array<{
  id: string;
  label: string;
  text?: string;
  media_urls?: string[];
  button_text?: string;
  button_url?: string;
  use_text?: boolean;
  use_media?: boolean;
  use_button?: boolean;
  use_city_list?: boolean;
  use_support_forward?: boolean;
  city_entries?: Array<{
    city: string;
    text?: string;
    media_urls?: string[];
    button_text?: string;
    button_url?: string;
  }>;
}> {
  return menuItems.map((item) => ({
    id: item.id,
    label: item.label,
    text: item.use_text ? item.text.trim() || undefined : undefined,
    media_urls: item.use_media && item.media_urls.length ? item.media_urls : undefined,
    button_text: item.use_button ? item.button_text.trim() || undefined : undefined,
    button_url: item.use_button ? item.button_url.trim() || undefined : undefined,
    use_text: item.use_text || undefined,
    use_media: item.use_media || undefined,
    use_button: item.use_button || undefined,
    use_city_list: item.use_city_list || undefined,
    use_support_forward: item.use_support_forward || undefined,
    city_entries: item.use_city_list
      ? item.city_entries
          .filter((entry) => entry.city.trim())
          .map((entry) => ({
            city: entry.city.trim(),
            text: entry.text.trim() || undefined,
            media_urls: entry.media_urls.length ? entry.media_urls : undefined,
            button_text: entry.button_text.trim() || undefined,
            button_url: entry.button_url.trim() || undefined,
          }))
      : undefined,
  }));
}

export function IntegrationSettings() {
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [vkStatus, setVkStatus] = useState<VKStatus | null>(null);

  // Telegram form
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramValidateStatus, setTelegramValidateStatus] = useState<Status>('idle');
  const [telegramValidationResult, setTelegramValidationResult] = useState<any>(null);
  const [telegramSaveStatus, setTelegramSaveStatus] = useState<Status>('idle');
  const [telegramMenuItems, setTelegramMenuItems] = useState<TelegramMenuItemConfig[]>(
    getDefaultTelegramMenuItems()
  );
  const [telegramUploadStatus, setTelegramUploadStatus] = useState<Record<string, Status>>({});
  const [telegramSupportChatId, setTelegramSupportChatId] = useState('');
  const [selectedTelegramMenuItemId, setSelectedTelegramMenuItemId] = useState('balance_card');

  // VK form
  const [vkToken, setVkToken] = useState('');
  const [vkGroupId, setVkGroupId] = useState('');
  const [vkApiVersion, setVkApiVersion] = useState('5.131');
  const [vkEnabled, setVkEnabled] = useState(false);
  const [vkValidateStatus, setVkValidateStatus] = useState<Status>('idle');
  const [vkValidationResult, setVkValidationResult] = useState<any>(null);
  const [vkSaveStatus, setVkSaveStatus] = useState<Status>('idle');

  const [info, setInfo] = useState<string | null>(null);

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
      setTelegramSupportChatId(status.telegram.config?.support_chat_id || '');
      setTelegramMenuItems(mapTelegramMenuItems(status.telegram.config?.menu_items));
    } catch (e: any) {
      const msg = String(e?.message || e);
      setInfo(msg.toLowerCase().includes('forbidden') ? 'Нет доступа к статусу интеграций' : msg);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

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
      await Api.saveTelegramSettings(
        telegramToken.trim(),
        telegramEnabled,
        telegramSupportChatId.trim(),
        serializeTelegramMenuItems(telegramMenuItems)
      );
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

  function updateTelegramMenuItem(
    itemId: string,
    field:
      | 'text'
      | 'button_text'
      | 'button_url'
      | 'use_text'
      | 'use_media'
      | 'use_button'
      | 'use_city_list'
      | 'use_support_forward',
    value: string | boolean
  ) {
    setTelegramMenuItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    );
  }

  function updateTelegramCityEntry(
    itemId: string,
    index: number,
    field: keyof TelegramCityEntry,
    value: string | string[]
  ) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              city_entries: item.city_entries.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, [field]: value } : entry
              ),
            }
      )
    );
  }

  function addTelegramCityEntry(itemId: string) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              city_entries: [
                ...item.city_entries,
                { city: '', text: '', media_urls: [], button_text: '', button_url: '' },
              ],
            }
      )
    );
  }

  function removeTelegramCityEntry(itemId: string, index: number) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              city_entries: item.city_entries.filter((_, entryIndex) => entryIndex !== index),
            }
      )
    );
  }

  function appendTelegramMedia(itemId: string, url: string) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              media_urls: item.media_urls.includes(url)
                ? item.media_urls
                : [...item.media_urls, url],
            }
          : item
      )
    );
  }

  function appendTelegramCityMedia(itemId: string, index: number, url: string) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              city_entries: item.city_entries.map((entry, entryIndex) =>
                entryIndex !== index
                  ? entry
                  : {
                      ...entry,
                      media_urls: entry.media_urls.includes(url)
                        ? entry.media_urls
                        : [...entry.media_urls, url],
                    }
              ),
            }
      )
    );
  }

  function removeTelegramMedia(itemId: string, url: string) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, media_urls: item.media_urls.filter((mediaUrl) => mediaUrl !== url) }
          : item
      )
    );
  }

  function removeTelegramCityMedia(itemId: string, index: number, url: string) {
    setTelegramMenuItems((current) =>
      current.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              city_entries: item.city_entries.map((entry, entryIndex) =>
                entryIndex !== index
                  ? entry
                  : {
                      ...entry,
                      media_urls: entry.media_urls.filter((mediaUrl) => mediaUrl !== url),
                    }
              ),
            }
      )
    );
  }

  async function uploadTelegramFiles(itemId: string, files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    setTelegramUploadStatus((current) => ({ ...current, [itemId]: 'loading' }));
    try {
      for (const file of selectedFiles) {
        const result = await Api.uploadTelegramMedia(file);
        appendTelegramMedia(itemId, result.url);
      }
      setTelegramUploadStatus((current) => ({ ...current, [itemId]: 'success' }));
    } catch (e: any) {
      setTelegramUploadStatus((current) => ({ ...current, [itemId]: 'error' }));
      setInfo(`Ошибка загрузки медиа: ${e.message || e}`);
    }
  }

  async function handleTelegramFileChange(itemId: string, event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;
    await uploadTelegramFiles(itemId, event.target.files);
    event.target.value = '';
  }

  async function handleTelegramDrop(itemId: string, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!event.dataTransfer.files?.length) return;
    await uploadTelegramFiles(itemId, event.dataTransfer.files);
  }

  async function uploadTelegramCityFiles(itemId: string, index: number, files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    const uploadKey = `${itemId}:city:${index}`;
    setTelegramUploadStatus((current) => ({ ...current, [uploadKey]: 'loading' }));
    try {
      for (const file of selectedFiles) {
        const result = await Api.uploadTelegramMedia(file);
        appendTelegramCityMedia(itemId, index, result.url);
      }
      setTelegramUploadStatus((current) => ({ ...current, [uploadKey]: 'success' }));
    } catch (e: any) {
      setTelegramUploadStatus((current) => ({ ...current, [uploadKey]: 'error' }));
      setInfo(`Ошибка загрузки медиа: ${e.message || e}`);
    }
  }

  async function handleTelegramCityFileChange(
    itemId: string,
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files?.length) return;
    await uploadTelegramCityFiles(itemId, index, event.target.files);
    event.target.value = '';
  }

  async function handleTelegramCityDrop(
    itemId: string,
    index: number,
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    if (!event.dataTransfer.files?.length) return;
    await uploadTelegramCityFiles(itemId, index, event.dataTransfer.files);
  }

  const selectedTelegramMenuItem =
    telegramMenuItems.find((item) => item.id === selectedTelegramMenuItemId) ||
    telegramMenuItems[0];

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

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Support Chat / Channel ID
            </div>
            <input
              className="input"
              value={telegramSupportChatId}
              onChange={(e) => setTelegramSupportChatId(e.target.value)}
              placeholder="-1001234567890"
              style={{ width: '100%' }}
            />
          </div>

          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 12,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>Конфигуратор меню Telegram</div>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
              <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Раздел меню</div>
                  <select
                    className="input"
                    value={selectedTelegramMenuItemId}
                    onChange={(e) => setSelectedTelegramMenuItemId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {telegramMenuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedTelegramMenuItem && (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 10,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{selectedTelegramMenuItem.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {
                        TELEGRAM_MENU_DEFINITIONS.find(
                          (definition) => definition.id === selectedTelegramMenuItem.id
                        )?.description
                      }
                    </div>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedTelegramMenuItem.use_text}
                        onChange={(e) =>
                          updateTelegramMenuItem(
                            selectedTelegramMenuItem.id,
                            'use_text',
                            e.target.checked
                          )
                        }
                      />
                      Текст
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedTelegramMenuItem.use_media}
                        onChange={(e) =>
                          updateTelegramMenuItem(
                            selectedTelegramMenuItem.id,
                            'use_media',
                            e.target.checked
                          )
                        }
                      />
                      Медиа
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedTelegramMenuItem.use_button}
                        onChange={(e) =>
                          updateTelegramMenuItem(
                            selectedTelegramMenuItem.id,
                            'use_button',
                            e.target.checked
                          )
                        }
                      />
                      Кнопка
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedTelegramMenuItem.use_city_list}
                        onChange={(e) =>
                          updateTelegramMenuItem(
                            selectedTelegramMenuItem.id,
                            'use_city_list',
                            e.target.checked
                          )
                        }
                      />
                      Список по городам
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedTelegramMenuItem.use_support_forward}
                        onChange={(e) =>
                          updateTelegramMenuItem(
                            selectedTelegramMenuItem.id,
                            'use_support_forward',
                            e.target.checked
                          )
                        }
                      />
                      Переслать вопрос в support chat
                    </label>
                  </div>
                )}
              </div>

              {selectedTelegramMenuItem && (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 10,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {selectedTelegramMenuItem.use_text && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Текст</div>
                      <textarea
                        className="input"
                        value={selectedTelegramMenuItem.text}
                        onChange={(e) =>
                          updateTelegramMenuItem(
                            selectedTelegramMenuItem.id,
                            'text',
                            e.target.value
                          )
                        }
                        placeholder="Введите текст сообщения..."
                        rows={4}
                        style={{ width: '100%' }}
                      />
                      {(() => {
                        const definition = TELEGRAM_MENU_DEFINITIONS.find(
                          (d) => d.id === selectedTelegramMenuItem.id
                        );
                        const vars = definition?.availableVars || [];
                        if (vars.length === 0) return null;
                        return (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            Доступные переменные: {vars.join(', ')}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedTelegramMenuItem.use_media && (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => void handleTelegramDrop(selectedTelegramMenuItem.id, e)}
                      style={{
                        border: '1px dashed var(--border)',
                        borderRadius: 8,
                        padding: 12,
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Медиа</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Перетащите файлы сюда или выберите их вручную
                        </div>
                      </div>
                      <div
                        style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <input
                          id={`telegram-media-${selectedTelegramMenuItem.id}`}
                          type="file"
                          multiple
                          onChange={(e) =>
                            void handleTelegramFileChange(selectedTelegramMenuItem.id, e)
                          }
                        />
                        {getStatusBadge(
                          telegramUploadStatus[selectedTelegramMenuItem.id] || 'idle'
                        )}
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {selectedTelegramMenuItem.media_urls.length ? (
                          selectedTelegramMenuItem.media_urls.map((mediaUrl) => (
                            <div
                              key={mediaUrl}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                padding: 8,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {mediaUrl}
                              </div>
                              <button
                                className="btn"
                                onClick={() =>
                                  removeTelegramMedia(selectedTelegramMenuItem.id, mediaUrl)
                                }
                              >
                                Удалить
                              </button>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            Медиа ещё не загружены
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTelegramMenuItem.use_button && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                          Текст кнопки
                        </div>
                        <input
                          className="input"
                          value={selectedTelegramMenuItem.button_text}
                          onChange={(e) =>
                            updateTelegramMenuItem(
                              selectedTelegramMenuItem.id,
                              'button_text',
                              e.target.value
                            )
                          }
                          placeholder="Открыть каталог"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                          URL кнопки
                        </div>
                        <input
                          className="input"
                          value={selectedTelegramMenuItem.button_url}
                          onChange={(e) =>
                            updateTelegramMenuItem(
                              selectedTelegramMenuItem.id,
                              'button_url',
                              e.target.value
                            )
                          }
                          placeholder="https://..."
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedTelegramMenuItem.use_city_list && (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>Города</div>
                        <button
                          className="btn"
                          onClick={() => addTelegramCityEntry(selectedTelegramMenuItem.id)}
                        >
                          Добавить город
                        </button>
                      </div>
                      {selectedTelegramMenuItem.city_entries.length ? (
                        selectedTelegramMenuItem.city_entries.map((entry, index) => {
                          const uploadKey = `${selectedTelegramMenuItem.id}:city:${index}`;
                          return (
                            <div
                              key={`${selectedTelegramMenuItem.id}-${index}`}
                              style={{
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: 10,
                                display: 'grid',
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 10,
                                }}
                              >
                                <input
                                  className="input"
                                  value={entry.city}
                                  onChange={(e) =>
                                    updateTelegramCityEntry(
                                      selectedTelegramMenuItem.id,
                                      index,
                                      'city',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Москва"
                                  style={{ width: '100%' }}
                                />
                                <button
                                  className="btn"
                                  onClick={() =>
                                    removeTelegramCityEntry(selectedTelegramMenuItem.id, index)
                                  }
                                >
                                  Удалить
                                </button>
                              </div>
                              <textarea
                                className="input"
                                value={entry.text}
                                onChange={(e) =>
                                  updateTelegramCityEntry(
                                    selectedTelegramMenuItem.id,
                                    index,
                                    'text',
                                    e.target.value
                                  )
                                }
                                placeholder="Текст для выбранного города"
                                rows={3}
                                style={{ width: '100%' }}
                              />
                              <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) =>
                                  void handleTelegramCityDrop(selectedTelegramMenuItem.id, index, e)
                                }
                                style={{
                                  border: '1px dashed var(--border)',
                                  borderRadius: 8,
                                  padding: 10,
                                  display: 'grid',
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 10,
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <input
                                    type="file"
                                    multiple
                                    onChange={(e) =>
                                      void handleTelegramCityFileChange(
                                        selectedTelegramMenuItem.id,
                                        index,
                                        e
                                      )
                                    }
                                  />
                                  {getStatusBadge(telegramUploadStatus[uploadKey] || 'idle')}
                                </div>
                                {entry.media_urls.length ? (
                                  entry.media_urls.map((mediaUrl) => (
                                    <div
                                      key={mediaUrl}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 12,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {mediaUrl}
                                      </div>
                                      <button
                                        className="btn"
                                        onClick={() =>
                                          removeTelegramCityMedia(
                                            selectedTelegramMenuItem.id,
                                            index,
                                            mediaUrl
                                          )
                                        }
                                      >
                                        Удалить
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    Нет медиа для города
                                  </div>
                                )}
                              </div>
                              <div
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
                              >
                                <input
                                  className="input"
                                  value={entry.button_text}
                                  onChange={(e) =>
                                    updateTelegramCityEntry(
                                      selectedTelegramMenuItem.id,
                                      index,
                                      'button_text',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Текст кнопки"
                                  style={{ width: '100%' }}
                                />
                                <input
                                  className="input"
                                  value={entry.button_url}
                                  onChange={(e) =>
                                    updateTelegramCityEntry(
                                      selectedTelegramMenuItem.id,
                                      index,
                                      'button_url',
                                      e.target.value
                                    )
                                  }
                                  placeholder="https://..."
                                  style={{ width: '100%' }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Добавьте города для раздела «Меню и адреса»
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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
