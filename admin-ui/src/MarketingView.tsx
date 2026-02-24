import { useEffect, useState } from 'react';
import { Api, MarketingCampaign, MarketingSegment, MarketingTrigger } from './api';
import { AnalyticsCharts } from './components/AnalyticsCharts';

export function MarketingView() {
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
      const [c, s, t] = await Promise.all([
        Api.marketingCampaigns().then((r) => r.items),
        Api.marketingSegments().then((r) => r.items),
        Api.marketingTriggers().then((r) => r.items),
      ]);
      setCampaigns(c);
      setSegments(s);
      setTriggers(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Маркетинг</h1>
        <button onClick={loadData} className="text-sm text-blue-600 hover:underline">
          Обновить
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        <button
          className={`pb-2 px-1 ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('campaigns')}
        >
          Кампании
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'segments' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('segments')}
        >
          Сегменты и Аудитория
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'triggers' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('triggers')}
        >
          Триггеры
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'analytics' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('analytics')}
        >
          Аналитика
        </button>
      </div>

      {loading && <div className="text-gray-500">Загрузка...</div>}

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
        segment_id: Number(newSegmentId),
        type: newType,
        scheduled_at: undefined, // Immediate for now
      });
      setIsCreating(false);
      setNewName('');
      setNewContent('');
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
            <label className="block text-sm font-medium text-gray-700">Текст сообщения</label>
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
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!newName) {
      setError('Введите название сегмента');
      return;
    }
    try {
      const criteria: any = {};
      if (minBalance) criteria.min_balance = Number(minBalance);
      if (daysSinceVisit) criteria.days_since_visit = Number(daysSinceVisit);

      await Api.createMarketingSegment({
        name: newName,
        criteria,
      });
      setIsCreating(false);
      setNewName('');
      setMinBalance('');
      setDaysSinceVisit('');
      onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
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
            <div className="grid gap-3">
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
              <th className="p-2">Создан</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{s.id}</td>
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2 text-xs text-gray-600 font-mono">
                  {JSON.stringify(s.criteria)}
                </td>
                <td className="p-2 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {segments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
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
  const [newMessage, setNewMessage] = useState('');
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

      await Api.createMarketingTrigger({
        name: newName,
        event_source: eventSource,
        criteria,
        delay_hours: Number(newDelay),
        message_text: newMessage,
      });
      setIsCreating(false);
      setNewName('');
      setEventSource('pos.sale');
      setNewDelay('24');
      setMinAmount('');
      setDaysInactive('');
      setNewMessage('');
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
            </div>

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
