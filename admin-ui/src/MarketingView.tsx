import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Api,
    baseUrl,
    injectAuthHeaders,
    MarketingCampaign,
    MarketingSegment,
    MarketingTrigger,
} from './api';
import { AnalyticsCharts } from './components/AnalyticsCharts';

export function MarketingView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'campaigns' | 'segments' | 'triggers' | 'analytics'>('campaigns');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [triggers, setTriggers] = useState<MarketingTrigger[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [campaignsResponse, segmentsResponse, triggersResponse] = await Promise.all([
        Api.marketingCampaigns(),
        Api.marketingSegments(),
        Api.marketingTriggers(),
      ]);

      const campaignsData = Array.isArray((campaignsResponse as any)?.items)
        ? (campaignsResponse as any).items
        : Array.isArray(campaignsResponse)
          ? campaignsResponse
          : [];

      const segmentsData = Array.isArray((segmentsResponse as any)?.items)
        ? (segmentsResponse as any).items
        : Array.isArray(segmentsResponse)
          ? segmentsResponse
          : [];

      const triggersData = Array.isArray((triggersResponse as any)?.items)
        ? (triggersResponse as any).items
        : Array.isArray(triggersResponse)
          ? triggersResponse
          : [];

      setCampaigns(campaignsData as MarketingCampaign[]);
      setSegments(segmentsData as MarketingSegment[]);
      setTriggers(triggersData as MarketingTrigger[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('marketing.title')}</h1>
        <button onClick={loadData} className="text-sm text-blue-600 hover:underline">
          {t('marketing.refresh')}
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        <button
          className={`pb-2 px-1 ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('campaigns')}
        >
          {t('marketing.campaigns')}
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'segments' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('segments')}
        >
          {t('marketing.segments')}
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'triggers' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('triggers')}
        >
          {t('marketing.triggers')}
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'analytics' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('analytics')}
        >
          {t('marketing.analytics')}
        </button>
      </div>

      {loading && <div className="text-gray-500">{t('marketing.loading')}</div>}

      {!loading && tab === 'campaigns' && (
        <CampaignsManager campaigns={campaigns} segments={segments} onUpdate={loadData} />
      )}

      {!loading && tab === 'segments' && (
        <SegmentsManager segments={segments} onUpdate={loadData} />
      )}

      {!loading && tab === 'triggers' && (
        <TriggersManager triggers={triggers} onUpdate={loadData} />
      )}

      {!loading && tab === 'analytics' && <AnalyticsCharts />}
    </div>
  );
}

function CampaignsManager({
  campaigns,
  segments,
  onUpdate,
}: {
  campaigns: MarketingCampaign[];
  segments: MarketingSegment[];
  onUpdate: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newContentType, setNewContentType] = useState('text');
  const [newMediaUrls, setNewMediaUrls] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newSegmentId, setNewSegmentId] = useState<number | ''>('');
  const [newType, setNewType] = useState('telegram');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!newName || !newContent || !newSegmentId) {
      setError('Заполните все поля');
      return;
    }
    try {
      await Api.createMarketingCampaign({
        name: newName,
        content: newContent,
        content_type: newContentType,
        media_urls: newMediaUrls || undefined,
        caption: newCaption || undefined,
        segment_id: Number(newSegmentId),
        type: newType,
        scheduled_at: undefined, // Immediate for now
      });
      setIsCreating(false);
      setNewName('');
      setNewContent('');
      setNewContentType('text');
      setNewMediaUrls('');
      setNewCaption('');
      setNewSegmentId('');
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleSend(id: number) {
    if (!confirm('Отправить рассылку сейчас?')) return;
    try {
      await Api.sendMarketingCampaign(id);
      onUpdate();
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
          <h3 className="font-bold">Новая кампания</h3>
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Название</label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: Скидки к 8 марта"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Тип</label>
            <select
              className="input w-full"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              <option value="telegram">Telegram</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Сегмент</label>
            <select
              className="input w-full"
              value={newSegmentId}
              onChange={(e) => setNewSegmentId(Number(e.target.value))}
            >
              <option value="">Выберите сегмент...</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Тип контента</label>
            <select
              className="input w-full"
              value={newContentType}
              onChange={(e) => setNewContentType(e.target.value)}
            >
              <option value="text">Текст</option>
              <option value="photo">Фотография</option>
              <option value="video">Видео</option>
              <option value="document">Документ</option>
              <option value="media_group">Альбом (несколько файлов)</option>
            </select>
          </div>

          {newContentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {newContentType === 'media_group'
                  ? 'URLы медиа файлов (JSON массив)'
                  : 'URL медиа файла'}
              </label>
              <textarea
                className="input w-full h-12"
                value={newMediaUrls}
                onChange={(e) => setNewMediaUrls(e.target.value)}
                placeholder={
                  newContentType === 'media_group'
                    ? '[{"type":"photo","path":"https://example.com/image1.jpg"},{"type":"video","path":"https://example.com/video1.mp4"}]'
                    : 'https://example.com/image.jpg'
                }
              />
            </div>
          )}

          {newContentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Подпись</label>
              <textarea
                className="input w-full h-12"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder="Добавьте подпись..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {newContentType === 'text' ? 'Текст сообщения' : 'Альтернативный текст'}
            </label>
            <textarea
              className="input w-full h-24"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Привет! У нас скидки..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Создать
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setIsCreating(true)}>
          + Создать кампанию
        </button>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Название</th>
              <th className="p-2">Тип</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Создана</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{c.id}</td>
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{c.type}</span>
                </td>
                <td className="p-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      c.status === 'sent'
                        ? 'bg-green-100 text-green-700'
                        : c.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="p-2 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="p-2">
                  {c.status === 'draft' && (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleSend(c.id)}
                    >
                      Отправить
                    </button>
                  )}
                  {c.status === 'sent' && <span className="text-gray-400">Отправлено</span>}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Нет кампаний
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegmentsManager({
  segments,
  onUpdate,
}: {
  segments: MarketingSegment[];
  onUpdate: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  // Criteria builder state
  const [minBalance, setMinBalance] = useState('');
  const [daysSinceVisit, setDaysSinceVisit] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [purchaseFrequency, setPurchaseFrequency] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  async function handlePreview() {
    if (!newName) {
      setError('Введите название сегмента');
      return;
    }
    try {
      setIsPreviewing(true);
      const criteria: any = {};
      if (minBalance) criteria.min_balance = Number(minBalance);
      if (daysSinceVisit) criteria.days_since_visit = Number(daysSinceVisit);
      if (minPurchaseAmount) criteria.min_purchase_amount = Number(minPurchaseAmount);
      if (purchaseFrequency) criteria.purchase_frequency = Number(purchaseFrequency);
      if (selectedPreferences.length > 0) criteria.preferences = selectedPreferences;
      if (selectedGender) criteria.gender = selectedGender;
      if (ageMin || ageMax) {
        criteria.age_range = {};
        if (ageMin) criteria.age_range.min = Number(ageMin);
        if (ageMax) criteria.age_range.max = Number(ageMax);
      }

      // Create temporary segment for preview
      const tempSegment = await Api.createMarketingSegment({
        name: `PREVIEW_${newName}`,
        criteria,
      });

      // Get preview
      const response = await fetch(
        `${baseUrl()}/api/v1/marketing/segments/${tempSegment.id}/preview?limit=10`,
        {
          headers: injectAuthHeaders(),
          credentials: 'include',
        }
      );
      const data = await response.json();
      setPreview(data.customers);

      // Delete temporary segment
      await fetch(`${baseUrl()}/api/v1/marketing/segments/${tempSegment.id}`, {
        method: 'DELETE',
        headers: injectAuthHeaders(),
        credentials: 'include',
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!newName) {
      setError('Введите название сегмента');
      return;
    }
    try {
      const criteria: any = {};
      if (minBalance) criteria.min_balance = Number(minBalance);
      if (daysSinceVisit) criteria.days_since_visit = Number(daysSinceVisit);
      if (minPurchaseAmount) criteria.min_purchase_amount = Number(minPurchaseAmount);
      if (purchaseFrequency) criteria.purchase_frequency = Number(purchaseFrequency);
      if (selectedPreferences.length > 0) criteria.preferences = selectedPreferences;
      if (selectedGender) criteria.gender = selectedGender;
      if (ageMin || ageMax) {
        criteria.age_range = {};
        if (ageMin) criteria.age_range.min = Number(ageMin);
        if (ageMax) criteria.age_range.max = Number(ageMax);
      }

      await Api.createMarketingSegment({
        name: newName,
        criteria,
      });
      setIsCreating(false);
      setNewName('');
      setMinBalance('');
      setDaysSinceVisit('');
      setMinPurchaseAmount('');
      setPurchaseFrequency('');
      setSelectedPreferences([]);
      setSelectedGender('');
      setAgeMin('');
      setAgeMax('');
      setPreview([]);
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  const togglePreference = (preference: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(preference) ? prev.filter((p) => p !== preference) : [...prev, preference]
    );
  };

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-2xl">
          <h3 className="font-bold">Новый сегмент</h3>
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Название</label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: VIP клиенты"
            />
          </div>

          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-bold mb-2">Критерии фильтрации</h4>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Минимальный баланс баллов</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Дней с последнего визита (больше чем)
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={daysSinceVisit}
                    onChange={(e) => setDaysSinceVisit(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">
                    Минимальная сумма покупки (₽)
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Количество покупок (не менее)
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={purchaseFrequency}
                    onChange={(e) => setPurchaseFrequency(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500">Пол</label>
                <select
                  className="input w-full"
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                >
                  <option value="">Не выбран</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Возраст от</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Возраст до</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={ageMax}
                    onChange={(e) => setAgeMax(e.target.value)}
                    placeholder="65"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500">Предпочтения (выберите)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['coffee', 'tea', 'pastries', 'breakfast', 'lunch'].map((preference) => (
                    <label key={preference} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPreferences.includes(preference)}
                        onChange={() => togglePreference(preference)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {preference === 'coffee' && 'Кофе'}
                      {preference === 'tea' && 'Чай'}
                      {preference === 'pastries' && 'Выпечка'}
                      {preference === 'breakfast' && 'Завтрак'}
                      {preference === 'lunch' && 'Обед'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-bold mb-2">Предварительный просмотр (10 клиентов)</h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2">Имя</th>
                      <th className="p-2">Баланс</th>
                      <th className="p-2">Последний визит</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((customer, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-2">{customer.full_name}</td>
                        <td className="p-2">{customer.points_balance}</td>
                        <td className="p-2">
                          {new Date(customer.last_visit).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button className="btn btn-outline" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? 'Просмотр...' : 'Предварительный просмотр'}
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Создать
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setIsCreating(true)}>
          + Создать сегмент
        </button>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Название</th>
              <th className="p-2">Критерии</th>
              <th className="p-2">Обновлен</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{s.id}</td>
                <td className="p-2 font-medium">{s.name}</td>
                <td
                  className="p-2 text-xs text-gray-600 font-mono max-w-xs truncate"
                  title={JSON.stringify(s.criteria)}
                >
                  {JSON.stringify(s.criteria)}
                </td>
                <td className="p-2 text-gray-500">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="p-2">
                  <button
                    className="text-blue-600 hover:underline text-xs"
                    onClick={async () => {
                      try {
                        await fetch(`${baseUrl()}/api/v1/marketing/segments/${s.id}/refresh`, {
                          method: 'POST',
                          headers: injectAuthHeaders(),
                          credentials: 'include',
                        });
                        onUpdate();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    Обновить
                  </button>
                </td>
              </tr>
            ))}
            {segments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Нет сегментов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TriggersManager({
  triggers,
  onUpdate,
}: {
  triggers: MarketingTrigger[];
  onUpdate: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [eventSource, setEventSource] = useState('pos.sale');
  const [newDelay, setNewDelay] = useState('24');
  const [minAmount, setMinAmount] = useState('');
  const [daysInactive, setDaysInactive] = useState('');
  const [pointsToExpire, setPointsToExpire] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newMediaType, setNewMediaType] = useState<string | ''>('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!newName || !newMessage) {
      setError('Введите название и текст сообщения');
      return;
    }
    try {
      const criteria: any = {};
      if (eventSource === 'pos.sale' && minAmount) criteria.min_amount = Number(minAmount);
      if (eventSource === 'customer.inactive' && daysInactive)
        criteria.days_inactive = Number(daysInactive);
      if (eventSource === 'points.expiration' && pointsToExpire)
        criteria.points_to_expire = Number(pointsToExpire);
      if (eventSource === 'pos.sale' && purchaseCategory)
        criteria.purchase_category = purchaseCategory;

      await Api.createMarketingTrigger({
        name: newName,
        event_source: eventSource,
        criteria,
        delay_hours: Number(newDelay),
        message_text: newMessage,
        media_type: newMediaType || undefined,
        media_url: newMediaUrl || undefined,
        caption: newCaption || undefined,
      });
      setIsCreating(false);
      setNewName('');
      setEventSource('pos.sale');
      setNewDelay('24');
      setMinAmount('');
      setDaysInactive('');
      setPointsToExpire('');
      setPurchaseCategory('');
      setNewMessage('');
      setNewMediaType('');
      setNewMediaUrl('');
      setNewCaption('');
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">Конструктор триггера</h3>
            <div className="pill pillGood">Visual Builder v2</div>
          </div>
          {error && <div className="text-red-600 text-sm p-2 bg-red-50 rounded">{error}</div>}

          <div className="grid gap-4 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Название триггера
              </label>
              <input
                className="input w-full bg-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: VIP Поздравление"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Событие-источник
                </label>
                <select
                  className="input w-full bg-white font-medium"
                  value={eventSource}
                  onChange={(e) => setEventSource(e.target.value)}
                >
                  <option value="pos.sale">🛒 Покупка на кассе</option>
                  <option value="customer.birthday">🎂 День Рождения</option>
                  <option value="customer.inactive">💤 Клиент "остыл"</option>
                  <option value="customer.welcome">👋 Приветственное сообщение</option>
                  <option value="points.expiration">⏰ Истечение баллов</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Задержка (ч)
                </label>
                <input
                  className="input w-full bg-white"
                  type="number"
                  value={newDelay}
                  onChange={(e) => setNewDelay(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span>⚙️ Условие срабатывания</span>
              </h4>

              {eventSource === 'pos.sale' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Сумма заказа ≥</span>
                    <input
                      className="input w-32"
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="5000"
                    />
                    <span className="text-sm text-gray-600">₽</span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Категория покупки</label>
                    <select
                      className="input w-full"
                      value={purchaseCategory}
                      onChange={(e) => setPurchaseCategory(e.target.value)}
                    >
                      <option value="">Все категории</option>
                      <option value="coffee">Кофе</option>
                      <option value="tea">Чай</option>
                      <option value="pastries">Выпечка</option>
                      <option value="breakfast">Завтрак</option>
                      <option value="lunch">Обед</option>
                    </select>
                  </div>
                </div>
              )}
              {eventSource === 'customer.inactive' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Неактивен более</span>
                  <input
                    className="input w-24"
                    type="number"
                    value={daysInactive}
                    onChange={(e) => setDaysInactive(e.target.value)}
                    placeholder="30"
                  />
                  <span className="text-sm text-gray-600">дней</span>
                </div>
              )}
              {eventSource === 'customer.birthday' && (
                <div className="text-xs text-blue-600 italic bg-blue-50 p-2 rounded">
                  Автоматическое срабатывание в 09:00 по местному времени в день рождения.
                </div>
              )}
              {eventSource === 'customer.welcome' && (
                <div className="text-xs text-blue-600 italic bg-blue-50 p-2 rounded">
                  Срабатывает для новых клиентов в течение 24 часов после регистрации.
                </div>
              )}
              {eventSource === 'points.expiration' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Баллы к истечению ≥</span>
                  <input
                    className="input w-32"
                    type="number"
                    value={pointsToExpire}
                    onChange={(e) => setPointsToExpire(e.target.value)}
                    placeholder="100"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Тип медиа
              </label>
              <select
                className="input w-full bg-white"
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value)}
              >
                <option value="">Нет медиа</option>
                <option value="photo">Фотография</option>
                <option value="video">Видео</option>
                <option value="document">Документ</option>
              </select>
            </div>

            {newMediaType && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  URL медиа файла
                </label>
                <input
                  className="input w-full bg-white"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}

            {newMediaType && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Подпись к медиа
                </label>
                <textarea
                  className="input w-full h-12 bg-white font-mono text-sm"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Подпись к изображению..."
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Шаблон сообщения (Telegram)
              </label>
              <textarea
                className="input w-full h-24 bg-white font-mono text-sm"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Привет! Рады видеть тебя снова. Вот твой бонус..."
              />
              <div className="mt-1 text-[10px] text-gray-400">
                Доступные теги: {'{name}'}, {'{points}'}, {'{tier}'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button className="btn btn-primary px-8" onClick={handleCreate}>
              Запустить триггер
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            className="btn btn-primary shadow-lg hover:scale-[1.02] transition-transform"
            onClick={() => setIsCreating(true)}
          >
            + Добавить новый триггер
          </button>
          <div className="text-xs text-gray-400">
            Активных триггеров: {triggers.filter((t) => t.active).length}
          </div>
        </div>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Название</th>
              <th className="p-2">Условие</th>
              <th className="p-2">Задержка</th>
              <th className="p-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{t.id}</td>
                <td className="p-2 font-medium">{t.name}</td>
                <td className="p-2 text-xs text-gray-600 font-mono">
                  {Object.keys(t.criteria_json).length > 0
                    ? JSON.stringify(t.criteria_json)
                    : 'Без условий'}
                </td>
                <td className="p-2">{t.delay_hours} ч.</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {t.active ? 'Активен' : 'Отключен'}
                  </span>
                </td>
              </tr>
            ))}
            {triggers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Нет триггеров
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Api,
    baseUrl,
    injectAuthHeaders,
    MarketingCampaign,
    MarketingSegment,
    MarketingTrigger,
} from './api';
import { AnalyticsCharts } from './components/AnalyticsCharts';

export function MarketingView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'campaigns' | 'segments' | 'triggers' | 'analytics'>('campaigns');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [triggers, setTriggers] = useState<MarketingTrigger[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [campaignsResponse, segmentsResponse, triggersResponse] = await Promise.all([
        Api.marketingCampaigns(),
        Api.marketingSegments(),
        Api.marketingTriggers(),
      ]);

      const campaignsData = Array.isArray((campaignsResponse as any)?.items)
        ? (campaignsResponse as any).items
        : Array.isArray(campaignsResponse)
          ? campaignsResponse
          : [];

      const segmentsData = Array.isArray((segmentsResponse as any)?.items)
        ? (segmentsResponse as any).items
        : Array.isArray(segmentsResponse)
          ? segmentsResponse
          : [];

      const triggersData = Array.isArray((triggersResponse as any)?.items)
        ? (triggersResponse as any).items
        : Array.isArray(triggersResponse)
          ? triggersResponse
          : [];

      setCampaigns(campaignsData as MarketingCampaign[]);
      setSegments(segmentsData as MarketingSegment[]);
      setTriggers(triggersData as MarketingTrigger[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('marketing.title')}</h1>
        <button onClick={loadData} className="text-sm text-blue-600 hover:underline">
          {t('marketing.refresh')}
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        <button
          className={`pb-2 px-1 ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('campaigns')}
        >
          {t('marketing.campaigns')}
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'segments' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('segments')}
        >
          {t('marketing.segments')}
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'triggers' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('triggers')}
        >
          {t('marketing.triggers')}
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'analytics' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('analytics')}
        >
          {t('marketing.analytics')}
        </button>
      </div>

      {loading && <div className="text-gray-500">{t('marketing.loading')}</div>}

      {!loading && tab === 'campaigns' && (
        <CampaignsManager campaigns={campaigns} segments={segments} onUpdate={loadData} />
      )}

      {!loading && tab === 'segments' && (
        <SegmentsManager segments={segments} onUpdate={loadData} />
      )}

      {!loading && tab === 'triggers' && (
        <TriggersManager triggers={triggers} onUpdate={loadData} />
      )}

      {!loading && tab === 'analytics' && <AnalyticsCharts />}
    </div>
  );
}

function CampaignsManager({
  campaigns,
  segments,
  onUpdate,
}: {
  campaigns: MarketingCampaign[];
  segments: MarketingSegment[];
  onUpdate: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newContentType, setNewContentType] = useState('text');
  const [newMediaUrls, setNewMediaUrls] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newSegmentId, setNewSegmentId] = useState<number | ''>('');
  const [newType, setNewType] = useState('telegram');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!newName || !newContent || !newSegmentId) {
      setError('Заполните все поля');
      return;
    }
    try {
      await Api.createMarketingCampaign({
        name: newName,
        content: newContent,
        content_type: newContentType,
        media_urls: newMediaUrls || undefined,
        caption: newCaption || undefined,
        segment_id: Number(newSegmentId),
        type: newType,
        scheduled_at: undefined, // Immediate for now
      });
      setIsCreating(false);
      setNewName('');
      setNewContent('');
      setNewContentType('text');
      setNewMediaUrls('');
      setNewCaption('');
      setNewSegmentId('');
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleSend(id: number) {
    if (!confirm('Отправить рассылку сейчас?')) return;
    try {
      await Api.sendMarketingCampaign(id);
      onUpdate();
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
          <h3 className="font-bold">Новая кампания</h3>
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Название</label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: Скидки к 8 марта"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Тип</label>
            <select
              className="input w-full"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              <option value="telegram">Telegram</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Сегмент</label>
            <select
              className="input w-full"
              value={newSegmentId}
              onChange={(e) => setNewSegmentId(Number(e.target.value))}
            >
              <option value="">Выберите сегмент...</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Тип контента</label>
            <select
              className="input w-full"
              value={newContentType}
              onChange={(e) => setNewContentType(e.target.value)}
            >
              <option value="text">Текст</option>
              <option value="photo">Фотография</option>
              <option value="video">Видео</option>
              <option value="document">Документ</option>
              <option value="media_group">Альбом (несколько файлов)</option>
            </select>
          </div>

          {newContentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {newContentType === 'media_group'
                  ? 'URLы медиа файлов (JSON массив)'
                  : 'URL медиа файла'}
              </label>
              <textarea
                className="input w-full h-12"
                value={newMediaUrls}
                onChange={(e) => setNewMediaUrls(e.target.value)}
                placeholder={
                  newContentType === 'media_group'
                    ? '[{"type":"photo","path":"https://example.com/image1.jpg"},{"type":"video","path":"https://example.com/video1.mp4"}]'
                    : 'https://example.com/image.jpg'
                }
              />
            </div>
          )}

          {newContentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Подпись</label>
              <textarea
                className="input w-full h-12"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder="Добавьте подпись..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {newContentType === 'text' ? 'Текст сообщения' : 'Альтернативный текст'}
            </label>
            <textarea
              className="input w-full h-24"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Привет! У нас скидки..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Создать
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setIsCreating(true)}>
          + Создать кампанию
        </button>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Название</th>
              <th className="p-2">Тип</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Создана</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{c.id}</td>
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{c.type}</span>
                </td>
                <td className="p-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      c.status === 'sent'
                        ? 'bg-green-100 text-green-700'
                        : c.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="p-2 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="p-2">
                  {c.status === 'draft' && (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleSend(c.id)}
                    >
                      Отправить
                    </button>
                  )}
                  {c.status === 'sent' && <span className="text-gray-400">Отправлено</span>}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Нет кампаний
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegmentsManager({
  segments,
  onUpdate,
}: {
  segments: MarketingSegment[];
  onUpdate: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  // Criteria builder state
  const [minBalance, setMinBalance] = useState('');
  const [daysSinceVisit, setDaysSinceVisit] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [purchaseFrequency, setPurchaseFrequency] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  async function handlePreview() {
    if (!newName) {
      setError('Введите название сегмента');
      return;
    }
    try {
      setIsPreviewing(true);
      const criteria: any = {};
      if (minBalance) criteria.min_balance = Number(minBalance);
      if (daysSinceVisit) criteria.days_since_visit = Number(daysSinceVisit);
      if (minPurchaseAmount) criteria.min_purchase_amount = Number(minPurchaseAmount);
      if (purchaseFrequency) criteria.purchase_frequency = Number(purchaseFrequency);
      if (selectedPreferences.length > 0) criteria.preferences = selectedPreferences;
      if (selectedGender) criteria.gender = selectedGender;
      if (ageMin || ageMax) {
        criteria.age_range = {};
        if (ageMin) criteria.age_range.min = Number(ageMin);
        if (ageMax) criteria.age_range.max = Number(ageMax);
      }

      // Create temporary segment for preview
      const tempSegment = await Api.createMarketingSegment({
        name: `PREVIEW_${newName}`,
        criteria,
      });

      // Get preview
      const response = await fetch(
        `${baseUrl()}/api/v1/marketing/segments/${tempSegment.id}/preview?limit=10`,
        {
          headers: injectAuthHeaders(),
          credentials: 'include',
        }
      );
      const data = await response.json();
      setPreview(data.customers);

      // Delete temporary segment
      await fetch(`${baseUrl()}/api/v1/marketing/segments/${tempSegment.id}`, {
        method: 'DELETE',
        headers: injectAuthHeaders(),
        credentials: 'include',
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!newName) {
      setError('Введите название сегмента');
      return;
    }
    try {
      const criteria: any = {};
      if (minBalance) criteria.min_balance = Number(minBalance);
      if (daysSinceVisit) criteria.days_since_visit = Number(daysSinceVisit);
      if (minPurchaseAmount) criteria.min_purchase_amount = Number(minPurchaseAmount);
      if (purchaseFrequency) criteria.purchase_frequency = Number(purchaseFrequency);
      if (selectedPreferences.length > 0) criteria.preferences = selectedPreferences;
      if (selectedGender) criteria.gender = selectedGender;
      if (ageMin || ageMax) {
        criteria.age_range = {};
        if (ageMin) criteria.age_range.min = Number(ageMin);
        if (ageMax) criteria.age_range.max = Number(ageMax);
      }

      await Api.createMarketingSegment({
        name: newName,
        criteria,
      });
      setIsCreating(false);
      setNewName('');
      setMinBalance('');
      setDaysSinceVisit('');
      setMinPurchaseAmount('');
      setPurchaseFrequency('');
      setSelectedPreferences([]);
      setSelectedGender('');
      setAgeMin('');
      setAgeMax('');
      setPreview([]);
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  const togglePreference = (preference: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(preference) ? prev.filter((p) => p !== preference) : [...prev, preference]
    );
  };

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-2xl">
          <h3 className="font-bold">Новый сегмент</h3>
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Название</label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: VIP клиенты"
            />
          </div>

          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-bold mb-2">Критерии фильтрации</h4>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Минимальный баланс баллов</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Дней с последнего визита (больше чем)
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={daysSinceVisit}
                    onChange={(e) => setDaysSinceVisit(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">
                    Минимальная сумма покупки (₽)
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Количество покупок (не менее)
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={purchaseFrequency}
                    onChange={(e) => setPurchaseFrequency(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500">Пол</label>
                <select
                  className="input w-full"
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                >
                  <option value="">Не выбран</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Возраст от</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Возраст до</label>
                  <input
                    className="input w-full"
                    type="number"
                    value={ageMax}
                    onChange={(e) => setAgeMax(e.target.value)}
                    placeholder="65"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500">Предпочтения (выберите)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['coffee', 'tea', 'pastries', 'breakfast', 'lunch'].map((preference) => (
                    <label key={preference} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPreferences.includes(preference)}
                        onChange={() => togglePreference(preference)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {preference === 'coffee' && 'Кофе'}
                      {preference === 'tea' && 'Чай'}
                      {preference === 'pastries' && 'Выпечка'}
                      {preference === 'breakfast' && 'Завтрак'}
                      {preference === 'lunch' && 'Обед'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-bold mb-2">Предварительный просмотр (10 клиентов)</h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2">Имя</th>
                      <th className="p-2">Баланс</th>
                      <th className="p-2">Последний визит</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((customer, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-2">{customer.full_name}</td>
                        <td className="p-2">{customer.points_balance}</td>
                        <td className="p-2">
                          {new Date(customer.last_visit).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button className="btn btn-outline" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? 'Просмотр...' : 'Предварительный просмотр'}
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Создать
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setIsCreating(true)}>
          + Создать сегмент
        </button>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Название</th>
              <th className="p-2">Критерии</th>
              <th className="p-2">Обновлен</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{s.id}</td>
                <td className="p-2 font-medium">{s.name}</td>
                <td
                  className="p-2 text-xs text-gray-600 font-mono max-w-xs truncate"
                  title={JSON.stringify(s.criteria)}
                >
                  {JSON.stringify(s.criteria)}
                </td>
                <td className="p-2 text-gray-500">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="p-2">
                  <button
                    className="text-blue-600 hover:underline text-xs"
                    onClick={async () => {
                      try {
                        await fetch(`${baseUrl()}/api/v1/marketing/segments/${s.id}/refresh`, {
                          method: 'POST',
                          headers: injectAuthHeaders(),
                          credentials: 'include',
                        });
                        onUpdate();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    Обновить
                  </button>
                </td>
              </tr>
            ))}
            {segments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Нет сегментов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TriggersManager({
  triggers,
  onUpdate,
}: {
  triggers: MarketingTrigger[];
  onUpdate: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [eventSource, setEventSource] = useState('pos.sale');
  const [newDelay, setNewDelay] = useState('24');
  const [minAmount, setMinAmount] = useState('');
  const [daysInactive, setDaysInactive] = useState('');
  const [pointsToExpire, setPointsToExpire] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newMediaType, setNewMediaType] = useState<string | ''>('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!newName || !newMessage) {
      setError('Введите название и текст сообщения');
      return;
    }
    try {
      const criteria: any = {};
      if (eventSource === 'pos.sale' && minAmount) criteria.min_amount = Number(minAmount);
      if (eventSource === 'customer.inactive' && daysInactive)
        criteria.days_inactive = Number(daysInactive);
      if (eventSource === 'points.expiration' && pointsToExpire)
        criteria.points_to_expire = Number(pointsToExpire);
      if (eventSource === 'pos.sale' && purchaseCategory)
        criteria.purchase_category = purchaseCategory;

      await Api.createMarketingTrigger({
        name: newName,
        event_source: eventSource,
        criteria,
        delay_hours: Number(newDelay),
        message_text: newMessage,
        media_type: newMediaType || undefined,
        media_url: newMediaUrl || undefined,
        caption: newCaption || undefined,
      });
      setIsCreating(false);
      setNewName('');
      setEventSource('pos.sale');
      setNewDelay('24');
      setMinAmount('');
      setDaysInactive('');
      setPointsToExpire('');
      setPurchaseCategory('');
      setNewMessage('');
      setNewMediaType('');
      setNewMediaUrl('');
      setNewCaption('');
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">Конструктор триггера</h3>
            <div className="pill pillGood">Visual Builder v2</div>
          </div>
          {error && <div className="text-red-600 text-sm p-2 bg-red-50 rounded">{error}</div>}

          <div className="grid gap-4 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Название триггера
              </label>
              <input
                className="input w-full bg-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: VIP Поздравление"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Событие-источник
                </label>
                <select
                  className="input w-full bg-white font-medium"
                  value={eventSource}
                  onChange={(e) => setEventSource(e.target.value)}
                >
                  <option value="pos.sale">🛒 Покупка на кассе</option>
                  <option value="customer.birthday">🎂 День Рождения</option>
                  <option value="customer.inactive">💤 Клиент "остыл"</option>
                  <option value="customer.welcome">👋 Приветственное сообщение</option>
                  <option value="points.expiration">⏰ Истечение баллов</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Задержка (ч)
                </label>
                <input
                  className="input w-full bg-white"
                  type="number"
                  value={newDelay}
                  onChange={(e) => setNewDelay(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span>⚙️ Условие срабатывания</span>
              </h4>

              {eventSource === 'pos.sale' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Сумма заказа ≥</span>
                    <input
                      className="input w-32"
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="5000"
                    />
                    <span className="text-sm text-gray-600">₽</span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Категория покупки</label>
                    <select
                      className="input w-full"
                      value={purchaseCategory}
                      onChange={(e) => setPurchaseCategory(e.target.value)}
                    >
                      <option value="">Все категории</option>
                      <option value="coffee">Кофе</option>
                      <option value="tea">Чай</option>
                      <option value="pastries">Выпечка</option>
                      <option value="breakfast">Завтрак</option>
                      <option value="lunch">Обед</option>
                    </select>
                  </div>
                </div>
              )}
              {eventSource === 'customer.inactive' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Неактивен более</span>
                  <input
                    className="input w-24"
                    type="number"
                    value={daysInactive}
                    onChange={(e) => setDaysInactive(e.target.value)}
                    placeholder="30"
                  />
                  <span className="text-sm text-gray-600">дней</span>
                </div>
              )}
              {eventSource === 'customer.birthday' && (
                <div className="text-xs text-blue-600 italic bg-blue-50 p-2 rounded">
                  Автоматическое срабатывание в 09:00 по местному времени в день рождения.
                </div>
              )}
              {eventSource === 'customer.welcome' && (
                <div className="text-xs text-blue-600 italic bg-blue-50 p-2 rounded">
                  Срабатывает для новых клиентов в течение 24 часов после регистрации.
                </div>
              )}
              {eventSource === 'points.expiration' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Баллы к истечению ≥</span>
                  <input
                    className="input w-32"
                    type="number"
                    value={pointsToExpire}
                    onChange={(e) => setPointsToExpire(e.target.value)}
                    placeholder="100"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Тип медиа
              </label>
              <select
                className="input w-full bg-white"
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value)}
              >
                <option value="">Нет медиа</option>
                <option value="photo">Фотография</option>
                <option value="video">Видео</option>
                <option value="document">Документ</option>
              </select>
            </div>

            {newMediaType && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  URL медиа файла
                </label>
                <input
                  className="input w-full bg-white"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}

            {newMediaType && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Подпись к медиа
                </label>
                <textarea
                  className="input w-full h-12 bg-white font-mono text-sm"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Подпись к изображению..."
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Шаблон сообщения (Telegram)
              </label>
              <textarea
                className="input w-full h-24 bg-white font-mono text-sm"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Привет! Рады видеть тебя снова. Вот твой бонус..."
              />
              <div className="mt-1 text-[10px] text-gray-400">
                Доступные теги: {'{name}'}, {'{points}'}, {'{tier}'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button className="btn btn-primary px-8" onClick={handleCreate}>
              Запустить триггер
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            className="btn btn-primary shadow-lg hover:scale-[1.02] transition-transform"
            onClick={() => setIsCreating(true)}
          >
            + Добавить новый триггер
          </button>
          <div className="text-xs text-gray-400">
            Активных триггеров: {triggers.filter((t) => t.active).length}
          </div>
        </div>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Название</th>
              <th className="p-2">Условие</th>
              <th className="p-2">Задержка</th>
              <th className="p-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{t.id}</td>
                <td className="p-2 font-medium">{t.name}</td>
                <td className="p-2 text-xs text-gray-600 font-mono">
                  {Object.keys(t.criteria_json).length > 0
                    ? JSON.stringify(t.criteria_json)
                    : 'Без условий'}
                </td>
                <td className="p-2">{t.delay_hours} ч.</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {t.active ? 'Активен' : 'Отключен'}
                  </span>
                </td>
              </tr>
            ))}
            {triggers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Нет триггеров
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
