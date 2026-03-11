import { useEffect, useState } from 'react';
import { Api, ConsentRecord } from '../api';

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
                  {consent.consent_version}
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
    </div>
  );
}
