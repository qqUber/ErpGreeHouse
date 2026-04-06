import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Api,
  baseUrl,
  injectAuthHeaders,
  MarketingCampaign,
  MarketingCampaignPreview,
  MarketingSegment,
  MarketingTrigger,
} from './api';
import { useMarketingData } from './hooks/useMarketingData';
import { marketingService } from './services/marketing.service';
import { formatCurrency } from './utils/translationHelpers';

export function MarketingView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'campaigns' | 'segments' | 'triggers'>('campaigns');
  const { campaigns, segments, triggers, loading, error, refresh } = useMarketingData();

  return (
    <div className="marketing-view grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('marketing.title')}</h1>
        <button onClick={() => void refresh()} className="text-sm text-blue-600 hover:underline">
          {t('marketing.refresh')}
        </button>
      </div>

      <div className="marketing-tabs flex gap-6 border-b border-gray-200">
        <button
          className={`marketing-tab-btn pb-2 px-1 ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('campaigns')}
        >
          {t('marketing.campaigns')}
        </button>
        <button
          className={`marketing-tab-btn pb-2 px-1 ${tab === 'segments' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('segments')}
        >
          {t('marketing.segments')}
        </button>
        <button
          className={`marketing-tab-btn pb-2 px-1 ${tab === 'triggers' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('triggers')}
        >
          {t('marketing.triggers')}
        </button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {loading && <div className="marketing-loading text-gray-500">{t('marketing.loading')}</div>}

      {!loading && tab === 'campaigns' && (
        <CampaignsManager campaigns={campaigns} segments={segments} onUpdate={refresh} />
      )}

      {!loading && tab === 'segments' && <SegmentsManager segments={segments} onUpdate={refresh} />}

      {!loading && tab === 'triggers' && <TriggersManager triggers={triggers} onUpdate={refresh} />}
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
  onUpdate: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newContentType, setNewContentType] = useState('text');
  const [newMediaUrls, setNewMediaUrls] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newSegmentId, setNewSegmentId] = useState<number | ''>('');
  const [newType, setNewType] = useState('telegram');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<MarketingCampaignPreview | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  function resetForm() {
    setIsCreating(false);
    setNewName('');
    setNewContent('');
    setNewContentType('text');
    setNewMediaUrls('');
    setNewCaption('');
    setNewSegmentId('');
    setNewType('telegram');
    setNewBudgetLimit('');
    setPreview(null);
    setError('');
  }

  function buildCampaignPayload() {
    return {
      name: newName,
      content: newContent,
      content_type: newContentType,
      media_urls: newMediaUrls || undefined,
      caption: newCaption || undefined,
      segment_id: newSegmentId === '' ? null : Number(newSegmentId),
      type: newType,
      scheduled_at: undefined,
      budget_limit: newBudgetLimit.trim() ? Number(newBudgetLimit) : null,
    };
  }

  async function handleCreate() {
    if (!newName || !newContent || !newSegmentId) {
      setError(t('marketing.fillAllFields'));
      return;
    }

    // Validate JSON for media_group content type
    if (newContentType === 'media_group' && newMediaUrls) {
      try {
        const parsed = JSON.parse(newMediaUrls);
        if (!Array.isArray(parsed)) {
          setError(t('marketing.mediaGroupMustBeArray'));
          return;
        }
      } catch (e) {
        setError(t('marketing.invalidJson'));
        return;
      }
    }
    try {
      await marketingService.createCampaign(buildCampaignPayload());
      resetForm();
      await onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handlePreview() {
    if (!newName || !newContent || !newSegmentId) {
      setError(t('marketing.fillAllFields'));
      return;
    }
    try {
      setIsPreviewing(true);
      setError('');
      const response = await marketingService.previewCampaign(buildCampaignPayload());
      setPreview(response);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSend(id: number) {
    if (!confirm(t('marketing.confirmSend'))) return;
    try {
      setError('');
      setBusyId(id);
      await marketingService.sendCampaign(id);
      await onUpdate();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePause(id: number) {
    try {
      setError('');
      setBusyId(id);
      await marketingService.pauseCampaign(id);
      await onUpdate();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleResume(id: number) {
    try {
      setError('');
      setBusyId(id);
      await marketingService.resumeCampaign(id);
      await onUpdate();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm(t('marketingView.confirmCancel'))) return;
    try {
      setError('');
      setBusyId(id);
      await marketingService.cancelCampaign(id);
      await onUpdate();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleBudgetUpdate(id: number, currentValue?: number | null) {
    const nextValue = prompt(t('marketingView.setBudgetPrompt'), currentValue?.toString() ?? '');
    if (nextValue === null) return;
    const normalized = nextValue.trim() ? Number(nextValue) : null;
    if (normalized !== null && Number.isNaN(normalized)) {
      setError(t('marketingView.budgetMustBeNumber'));
      return;
    }
    try {
      setError('');
      setBusyId(id);
      await marketingService.updateCampaignBudget(id, normalized);
      await onUpdate();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
          <h3 className="font-bold">{t('marketing.createCampaign')}</h3>
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('marketing.campaignName')}
            </label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('marketing.campaignNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('marketingView.type')}
            </label>
            <select
              className="input w-full"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              <option value="telegram">{t('marketingView.channelTelegram')}</option>
              <option value="sms">{t('marketingView.channelSms')}</option>
              <option value="push">{t('marketingView.channelPush')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('marketingView.budgetLimit')}
            </label>
            <input
              className="input w-full"
              type="number"
              min="0"
              value={newBudgetLimit}
              onChange={(e) => setNewBudgetLimit(e.target.value)}
              placeholder={t('marketingView.budgetPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('marketingView.segment')}
            </label>
            <select
              className="input w-full"
              value={newSegmentId}
              onChange={(e) => setNewSegmentId(Number(e.target.value))}
            >
              <option value="">{t('marketingView.selectSegment')}</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('marketingView.contentType')}
            </label>
            <select
              className="input w-full"
              value={newContentType}
              onChange={(e) => setNewContentType(e.target.value)}
            >
              <option value="text">{t('marketingView.contentTypeText')}</option>
              <option value="photo">{t('marketingView.contentTypePhoto')}</option>
              <option value="video">{t('marketingView.contentTypeVideo')}</option>
              <option value="document">{t('marketingView.contentTypeDocument')}</option>
              <option value="media_group">{t('marketingView.contentTypeMediaGroup')}</option>
            </select>
          </div>

          {newContentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {newContentType === 'media_group'
                  ? t('marketingView.mediaUrlsJson')
                  : t('marketingView.mediaUrls')}
              </label>
              <textarea
                className="input w-full h-12"
                value={newMediaUrls}
                onChange={(e) => setNewMediaUrls(e.target.value)}
                placeholder={
                  newContentType === 'media_group'
                    ? t('marketingView.mediaGroupPlaceholder')
                    : t('marketingView.mediaUrlsPlaceholder')
                }
              />
            </div>
          )}

          {newContentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('marketingView.caption')}
              </label>
              <textarea
                className="input w-full h-12"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder={t('marketingView.captionPlaceholder')}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {newContentType === 'text'
                ? t('marketingView.messageText')
                : t('marketingView.altText')}
            </label>
            <textarea
              className="input w-full h-24"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t('marketingView.messagePlaceholder')}
            />
          </div>

          {preview ? (
            <div className="marketing-preview-panel rounded-xl border border-gray-200 bg-gray-50 p-4 grid gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{t('marketingView.previewTitle')}</h4>
                <span className="text-xs text-gray-500">
                  {t('marketingView.estimatedRecipients')}: {preview.estimated_recipients}
                </span>
              </div>
              <div className="grid gap-2">
                {preview.rendered_messages.length ? (
                  preview.rendered_messages.map((item) => (
                    <div
                      key={item.customer_id}
                      className="marketing-preview-item rounded-lg bg-white border border-gray-200 p-3"
                    >
                      <div className="text-xs text-gray-500 mb-1">{item.customer_name}</div>
                      <div className="text-sm whitespace-pre-wrap">{item.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    {t('marketingView.noPreviewRecipients')}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={resetForm}>
              {t('marketingView.cancel')}
            </button>
            <button className="btn btn-outline" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? t('marketingView.previewLoading') : t('marketingView.preview')}
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              {t('marketingView.create')}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setIsCreating(true)}>
          {t('marketingView.createCampaignButton')}
        </button>
      )}

      <div className="marketing-campaigns-table card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">{t('marketingView.id')}</th>
              <th className="p-2">{t('marketingView.name')}</th>
              <th className="p-2">{t('marketingView.campaignType')}</th>
              <th className="p-2">{t('marketingView.status')}</th>
              <th className="p-2">{t('marketingView.budget')}</th>
              <th className="p-2">{t('marketingView.created')}</th>
              <th className="p-2">{t('marketingView.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="marketing-campaign-row border-b last:border-0 hover:bg-gray-50"
              >
                <td className="p-2 text-gray-500">#{c.id}</td>
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2">
                  <span className="marketing-type-badge bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {c.type}
                  </span>
                </td>
                <td className="p-2">
                  <span
                    className={`marketing-status-badge px-2 py-0.5 rounded text-xs ${
                      c.status === 'completed'
                        ? 'marketing-status-badge-completed bg-green-100 text-green-700'
                        : c.status === 'scheduled' || c.status === 'active'
                          ? 'marketing-status-badge-active bg-blue-100 text-blue-700'
                          : c.status === 'paused'
                            ? 'marketing-status-badge-paused bg-orange-100 text-orange-700'
                            : 'marketing-status-badge-draft bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="p-2 text-xs text-gray-600">
                  {c.budget_limit != null ? `${c.budget_spent ?? 0} / ${c.budget_limit}` : '—'}
                </td>
                <td className="p-2 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-3 text-xs">
                    {(c.status === 'draft' ||
                      c.status === 'scheduled' ||
                      c.status === 'paused') && (
                      <button
                        className="marketing-action-btn marketing-action-btn-send text-blue-600 hover:underline"
                        onClick={() => handleSend(c.id)}
                        disabled={busyId === c.id}
                      >
                        {t('marketingView.send')}
                      </button>
                    )}
                    {(c.status === 'scheduled' || c.status === 'active') && (
                      <button
                        className="marketing-action-btn marketing-action-btn-pause text-orange-600 hover:underline"
                        onClick={() => handlePause(c.id)}
                        disabled={busyId === c.id}
                      >
                        {t('marketingView.pause')}
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button
                        className="marketing-action-btn marketing-action-btn-resume text-emerald-600 hover:underline"
                        onClick={() => handleResume(c.id)}
                        disabled={busyId === c.id}
                      >
                        {t('marketingView.resume')}
                      </button>
                    )}
                    {['draft', 'scheduled', 'active', 'paused'].includes(c.status) && (
                      <button
                        className="marketing-action-btn marketing-action-btn-cancel text-red-600 hover:underline"
                        onClick={() => handleCancel(c.id)}
                        disabled={busyId === c.id}
                      >
                        {t('marketingView.cancelCampaign')}
                      </button>
                    )}
                    <button
                      className="marketing-action-btn marketing-action-btn-budget text-gray-700 hover:underline"
                      onClick={() => handleBudgetUpdate(c.id, c.budget_limit)}
                      disabled={busyId === c.id}
                    >
                      {t('marketingView.budgetAction')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  {t('marketingView.noCampaigns')}
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
  onUpdate: () => Promise<void>;
}) {
  const { t } = useTranslation();
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
      setError(t('marketingView.enterSegmentName'));
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
      setError(t('marketingView.enterSegmentName'));
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
      await onUpdate();
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
          <h3 className="font-bold">{t('marketingView.newSegment')}</h3>
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('marketingView.segmentName')}
            </label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('marketingView.segmentNamePlaceholder')}
            />
          </div>

          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-bold mb-2">{t('marketingView.filterCriteria')}</h4>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">
                    {t('marketingView.minBalance')}
                  </label>
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
                    {t('marketingView.daysSinceVisit')}
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
                    {t('marketingView.minPurchaseAmount')}
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
                    {t('marketingView.purchaseFrequency')}
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
                <label className="block text-xs text-gray-500">{t('marketingView.gender')}</label>
                <select
                  className="input w-full"
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                >
                  <option value="">{t('marketingView.genderNotSelected')}</option>
                  <option value="male">{t('marketingView.genderMale')}</option>
                  <option value="female">{t('marketingView.genderFemale')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">
                    {t('marketingView.ageFrom')}
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">{t('marketingView.ageTo')}</label>
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
                <label className="block text-xs text-gray-500">
                  {t('marketingView.preferences')}
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['coffee', 'tea', 'pastries', 'breakfast', 'lunch'].map((preference) => (
                    <label key={preference} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPreferences.includes(preference)}
                        onChange={() => togglePreference(preference)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {preference === 'coffee' && t('marketingView.preferenceCoffee')}
                      {preference === 'tea' && t('marketingView.preferenceTea')}
                      {preference === 'pastries' && t('marketingView.preferencePastries')}
                      {preference === 'breakfast' && t('marketingView.preferenceBreakfast')}
                      {preference === 'lunch' && t('marketingView.preferenceLunch')}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-bold mb-2">{t('marketingView.previewSegment')}</h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2">{t('marketingView.previewName')}</th>
                      <th className="p-2">{t('marketingView.previewBalance')}</th>
                      <th className="p-2">{t('marketingView.previewLastVisit')}</th>
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
              {t('marketingView.cancel')}
            </button>
            <button className="btn btn-outline" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? t('marketingView.previewLoading') : t('marketingView.preview')}
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              {t('marketingView.create')}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setIsCreating(true)}>
          {t('marketingView.createSegmentButton')}
        </button>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">{t('marketingView.id')}</th>
              <th className="p-2">{t('marketingView.name')}</th>
              <th className="p-2">{t('marketingView.criteria')}</th>
              <th className="p-2">{t('marketingView.updated')}</th>
              <th className="p-2">{t('marketingView.actions')}</th>
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
                        await Api.refreshMarketingSegment(s.id);
                        await onUpdate();
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    {t('marketingView.refreshSegment')}
                  </button>
                </td>
              </tr>
            ))}
            {segments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  {t('marketingView.noSegments')}
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
  onUpdate: () => Promise<void>;
}) {
  const { t } = useTranslation();
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
      setError(t('marketingView.enterTriggerNameMessage'));
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
      await onUpdate();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="grid gap-6">
      {isCreating ? (
        <div className="card p-4 grid gap-4 max-w-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">{t('marketingView.triggerBuilder')}</h3>
            <div className="pill pillGood">{t('marketingView.visualBuilder')}</div>
          </div>
          {error && <div className="text-red-600 text-sm p-2 bg-red-50 rounded">{error}</div>}

          <div className="grid gap-4 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                {t('marketingView.triggerName')}
              </label>
              <input
                className="input w-full bg-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('marketingView.triggerNamePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t('marketingView.eventSource')}
                </label>
                <select
                  className="input w-full bg-white font-medium"
                  value={eventSource}
                  onChange={(e) => setEventSource(e.target.value)}
                >
                  <option value="pos.sale">{t('marketingView.eventPosSale')}</option>
                  <option value="customer.birthday">{t('marketingView.eventBirthday')}</option>
                  <option value="customer.inactive">{t('marketingView.eventInactive')}</option>
                  <option value="customer.welcome">{t('marketingView.eventWelcome')}</option>
                  <option value="points.expiration">
                    {t('marketingView.eventPointsExpiration')}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t('marketingView.delayHours')}
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
                <span>{t('marketingView.triggerCondition')}</span>
              </h4>

              {eventSource === 'pos.sale' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {t('marketingView.orderAmountMin')}
                    </span>
                    <input
                      className="input w-32"
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="5000"
                    />
                    <span className="text-sm text-gray-600">
                      {formatCurrency(0).replace('0', '').trim()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t('marketingView.purchaseCategory')}
                    </label>
                    <select
                      className="input w-full"
                      value={purchaseCategory}
                      onChange={(e) => setPurchaseCategory(e.target.value)}
                    >
                      <option value="">{t('marketingView.allCategories')}</option>
                      <option value="coffee">{t('marketingView.categoryCoffee')}</option>
                      <option value="tea">{t('marketingView.categoryTea')}</option>
                      <option value="pastries">{t('marketingView.categoryPastries')}</option>
                      <option value="breakfast">{t('marketingView.categoryBreakfast')}</option>
                      <option value="lunch">{t('marketingView.categoryLunch')}</option>
                    </select>
                  </div>
                </div>
              )}
              {eventSource === 'customer.inactive' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{t('marketingView.inactiveDays')}</span>
                  <input
                    className="input w-24"
                    type="number"
                    value={daysInactive}
                    onChange={(e) => setDaysInactive(e.target.value)}
                    placeholder="30"
                  />
                  <span className="text-sm text-gray-600">{t('marketingView.days')}</span>
                </div>
              )}
              {eventSource === 'customer.birthday' && (
                <div className="text-xs text-blue-600 italic bg-blue-50 p-2 rounded">
                  {t('marketingView.birthdayAutoTrigger')}
                </div>
              )}
              {eventSource === 'customer.welcome' && (
                <div className="text-xs text-blue-600 italic bg-blue-50 p-2 rounded">
                  {t('marketingView.welcomeTrigger')}
                </div>
              )}
              {eventSource === 'points.expiration' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{t('marketingView.pointsToExpire')}</span>
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
                {t('marketingView.mediaType')}
              </label>
              <select
                className="input w-full bg-white"
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value)}
              >
                <option value="">{t('marketingView.noMedia')}</option>
                <option value="photo">{t('marketingView.mediaPhoto')}</option>
                <option value="video">{t('marketingView.mediaVideo')}</option>
                <option value="document">{t('marketingView.mediaDocument')}</option>
              </select>
            </div>

            {newMediaType && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t('marketingView.mediaUrl')}
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
                  {t('marketingView.mediaCaption')}
                </label>
                <textarea
                  className="input w-full h-12 bg-white font-mono text-sm"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder={t('marketingView.mediaCaptionPlaceholder')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                {t('marketingView.messageTemplate')}
              </label>
              <textarea
                className="input w-full h-24 bg-white font-mono text-sm"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('marketingView.messageTemplatePlaceholder')}
              />
              <div className="mt-1 text-[10px] text-gray-400">
                {t('marketingView.availableTags')}: {'{name}'}, {'{points}'}, {'{tier}'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
              {t('marketingView.cancel')}
            </button>
            <button className="btn btn-primary px-8" onClick={handleCreate}>
              {t('marketingView.startTrigger')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            className="btn btn-primary shadow-lg hover:scale-[1.02] transition-transform"
            onClick={() => setIsCreating(true)}
          >
            {t('marketingView.addTriggerButton')}
          </button>
          <div className="text-xs text-gray-400">
            {t('marketingView.activeTriggers')}: {triggers.filter((t) => t.active).length}
          </div>
        </div>
      )}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">{t('marketingView.id')}</th>
              <th className="p-2">{t('marketingView.name')}</th>
              <th className="p-2">{t('marketingView.condition')}</th>
              <th className="p-2">{t('marketingView.delay')}</th>
              <th className="p-2">{t('marketingView.status')}</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map((trigger) => (
              <tr key={trigger.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 text-gray-500">#{trigger.id}</td>
                <td className="p-2 font-medium">{trigger.name}</td>
                <td className="p-2 text-xs text-gray-600 font-mono">
                  {Object.keys(trigger.criteria_json).length > 0
                    ? JSON.stringify(trigger.criteria_json)
                    : t('marketingView.noConditions')}
                </td>
                <td className="p-2">
                  {trigger.delay_hours} {t('marketingView.hoursSuffix')}
                </td>
                <td className="p-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${trigger.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {trigger.active
                      ? t('marketingView.triggerActive')
                      : t('marketingView.triggerInactive')}
                  </span>
                </td>
              </tr>
            ))}
            {triggers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  {t('marketingView.noTriggers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
