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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Дата и время
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Тип согласия
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Версия политики
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Источник
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Текст согласия
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                Загрузка...
              </td>
            </tr>
          ) : consents.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                Нет записей о согласиях
              </td>
            </tr>
          ) : (
            consents.map((consent) => (
              <tr key={consent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(consent.accepted_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consent.consent_type === 'data_processing' ? 'Обработка данных' : 
                   consent.consent_type === 'marketing' ? 'Маркетинговые коммуникации' : 
                   'Оба типа'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consent.consent_version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consent.source === 'tg' ? 'Telegram' : 'VK'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
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