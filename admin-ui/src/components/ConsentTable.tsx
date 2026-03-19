import { useEffect, useState } from 'react';
import { Api, ConsentRecord } from '../api';

export function ConsentTable({ customerId }: { customerId?: number }) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [customerId]);

  async function loadData() {
    setLoading(true);
    try {
      let data;
      if (customerId) {
        data = await Api.getCustomerConsents(customerId);
      } else {
        data = await Api.listConsents();
      }
      setConsents(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ minWidth: '100%' }}>
        <thead>
          <tr>
            <th>Дата и время</th>
            <th>Тип согласия</th>
            <th>Версия политики</th>
            <th>Источник</th>
            <th>Текст согласия</th>
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
                Загрузка...
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
                Нет записей о согласиях
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
                    ? 'Обработка данных'
                    : consent.consent_type === 'marketing'
                      ? 'Маркетинговые коммуникации'
                      : 'Оба типа'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>
                Детали согласия
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
                <strong>Версия соглашения:</strong> {selectedConsent.consent_version}
              </div>
              <div>
                <strong>Дата принятия:</strong> {new Date(selectedConsent.accepted_at).toLocaleString()}
              </div>
              <div>
                <strong>Тип согласия:</strong> {selectedConsent.consent_type === 'data_processing'
                  ? 'Обработка данных'
                  : selectedConsent.consent_type === 'marketing'
                    ? 'Маркетинговые коммуникации'
                    : 'Оба типа'}
              </div>
              <div>
                <strong>Источник:</strong> {selectedConsent.source === 'tg' ? 'Telegram' : 'VK'}
              </div>
              <div>
                <strong>IP адрес:</strong> {(selectedConsent as any).ip_address || 'Не указан'}
              </div>
              <div>
                <strong>Текст согласия:</strong>
                <div style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 'var(--font-size-sm)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedConsent.consent_text}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btnPrimary"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
