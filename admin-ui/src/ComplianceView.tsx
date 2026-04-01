import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Api } from './api';
import { ConsentTable } from './components/ConsentTable';
import { ProfileDeletion } from './components/ProfileDeletion';

export function ComplianceView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'consents' | 'delete'>('consents');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();

  return (
    <div className="grid gap-6">
      <div className="row">
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
          {t('compliance.title')}
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 8,
        }}
      >
        <button
          style={{
            padding: '8px 0',
            fontSize: 13,
            borderBottom: tab === 'consents' ? '2px solid var(--primary)' : 'none',
            color: tab === 'consents' ? 'var(--primary)' : 'var(--muted)',
            fontWeight: tab === 'consents' ? '600' : 'normal',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            if (tab !== 'consents') {
              e.currentTarget.style.color = 'var(--text)';
            }
          }}
          onMouseLeave={(e) => {
            if (tab !== 'consents') {
              e.currentTarget.style.color = 'var(--muted)';
            }
          }}
          onClick={() => setTab('consents')}
        >
          {t('compliance.consents')}
        </button>
        <button
          style={{
            padding: '8px 0',
            fontSize: 13,
            borderBottom: tab === 'delete' ? '2px solid var(--primary)' : 'none',
            color: tab === 'delete' ? 'var(--primary)' : 'var(--muted)',
            fontWeight: tab === 'delete' ? '600' : 'normal',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            if (tab !== 'delete') {
              e.currentTarget.style.color = 'var(--text)';
            }
          }}
          onMouseLeave={(e) => {
            if (tab !== 'delete') {
              e.currentTarget.style.color = 'var(--muted)';
            }
          }}
          onClick={() => setTab('delete')}
        >
          {t('compliance.profileDeletion')}
        </button>
      </div>

      {tab === 'consents' && (
        <div className="grid gap-6">
          <div className="row">
            <h2 style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)' }}>
              {t('compliance.consentRegistration')}
            </h2>
          </div>

          <div className="card cardFull" style={{ padding: 24 }}>
            <ConsentTable customerId={selectedCustomerId} />
          </div>
        </div>
      )}

      {tab === 'delete' && (
        <div className="grid gap-6">
          <div className="row">
            <h2 style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)' }}>
              {t('compliance.userProfileDeletion')}
            </h2>
          </div>

          <div className="card cardFull" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: '600',
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                {t('compliance.enterUserIdToDelete')}:
              </label>
              <input
                type="number"
                placeholder={t('compliance.userIdPlaceholder')}
                className="input w-full"
                style={{ padding: 12 }}
                onChange={(e) => setSelectedCustomerId(parseInt(e.target.value) || undefined)}
              />
            </div>

            {selectedCustomerId && (
              <ProfileDeletion
                customerId={selectedCustomerId}
                onDeleted={() => setSelectedCustomerId(undefined)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
