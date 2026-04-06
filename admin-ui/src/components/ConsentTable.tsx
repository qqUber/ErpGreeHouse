import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConsentRecord } from '../api';
import { useConsents } from '../hooks/use-consents';

export function ConsentTable({ customerId }: { customerId?: number }) {
  const { t } = useTranslation();
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  const consentsQuery = useConsents({ customerId });
  const consents = consentsQuery.data ?? [];
  const loading = consentsQuery.isLoading;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ minWidth: '100%' }}>
        <thead>
          <tr>
            <th>{t('compliance.dateTime')}</th>
            <th>{t('compliance.consentType')}</th>
            <th>{t('compliance.policyVersion')}</th>
            <th>{t('compliance.source')}</th>
            <th>{t('compliance.consentText')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                {t('compliance.loading')}
              </td>
            </tr>
          ) : consents.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                {t('compliance.noConsentRecords')}
              </td>
            </tr>
          ) : (
            consents.map((consent) => (
              <tr key={consent.id}>
                <td
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text)',
                  }}
                >
                  {new Date(consent.accepted_at).toLocaleString()}
                </td>
                <td
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text)',
                  }}
                >
                  {consent.consent_type === 'data_processing'
                    ? t('compliance.dataProcessingConsent')
                    : consent.consent_type === 'marketing'
                      ? t('compliance.marketingConsent')
                      : t('compliance.bothTypes')}
                </td>
                <td
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConsent(consent);
                      setShowModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: 'inherit',
                      padding: 0,
                    }}
                  >
                    {consent.consent_version}
                  </button>
                </td>
                <td
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text)',
                  }}
                >
                  {consent.source === 'tg' ? 'Telegram' : 'VK'}
                </td>
                <td
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {consent.consent_text}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Consent Details Modal */}
      {showModal && selectedConsent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>
                {t('compliance.consentDetails')}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--muted)',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <strong>{t('compliance.agreementVersion')}:</strong>{' '}
                {selectedConsent.consent_version}
              </div>
              <div>
                <strong>{t('compliance.acceptanceDate')}:</strong>{' '}
                {new Date(selectedConsent.accepted_at).toLocaleString()}
              </div>
              <div>
                <strong>{t('compliance.consentType')}:</strong>{' '}
                {selectedConsent.consent_type === 'data_processing'
                  ? t('compliance.dataProcessingConsent')
                  : selectedConsent.consent_type === 'marketing'
                    ? t('compliance.marketingConsent')
                    : t('compliance.bothTypes')}
              </div>
              <div>
                <strong>{t('compliance.source')}:</strong>{' '}
                {selectedConsent.source === 'tg' ? 'Telegram' : 'VK'}
              </div>
              <div>
                <strong>{t('compliance.ipAddress')}:</strong>{' '}
                {(selectedConsent as any).ip_address || t('compliance.notSpecified')}
              </div>
              <div>
                <strong>{t('compliance.consentText')}:</strong>
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontSize: 'var(--font-size-sm)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedConsent.consent_text}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btnPrimary">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
