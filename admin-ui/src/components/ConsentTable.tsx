import { Api, ConsentRecord } from '../api';
import { useState, useEffect } from 'react';

export function ConsentTable({ customerId }: { customerId?: number }) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);

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
        <thead style={{ background: 'rgba(243, 244, 246, 0.5)' }}>
          <tr>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Дата и время
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Тип согласия
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Версия политики
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Источник
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Текст согласия
            </th>
          </tr>
        </thead>
        <tbody style={{ background: 'var(--panel)' }}>
          {loading ? (
            <tr>
              <td colSpan={5} style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: 'var(--muted)',
                fontSize: 13
              }}>
                Загрузка...
              </td>
            </tr>
          ) : consents.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: 'var(--muted)',
                fontSize: 13
              }}>
                Нет записей о согласиях
              </td>
            </tr>
          ) : (
            consents.map((consent) => (
              <tr key={consent.id} style={{ 
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(243, 244, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--panel)';
              }}>
                <td style={{ 
                  padding: '12px 16px', 
                  whiteSpace: 'nowrap', 
                  fontSize: 13, 
                  color: 'var(--text)'
                }}>
                  {new Date(consent.accepted_at).toLocaleString()}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  whiteSpace: 'nowrap', 
                  fontSize: 13, 
                  color: 'var(--text)'
                }}>
                  {consent.consent_type === 'data_processing' ? 'Обработка данных' : 
                   consent.consent_type === 'marketing' ? 'Маркетинговые коммуникации' : 
                   'Оба типа'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  whiteSpace: 'nowrap', 
                  fontSize: 13, 
                  color: 'var(--text)'
                }}>
                  {consent.consent_version}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  whiteSpace: 'nowrap', 
                  fontSize: 13, 
                  color: 'var(--text)'
                }}>
                  {consent.source === 'tg' ? 'Telegram' : 'VK'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 13, 
                  color: 'var(--text)',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {consent.consent_text}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}