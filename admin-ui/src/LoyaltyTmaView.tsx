import WebApp from '@twa-dev/sdk';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { api } from './api';

interface TmaCustomerData {
  first_name: string;
  telegram_id: number;
  balance: number;
  qr_token: string;
  tier: string;
  percent: number;
  spent_amount: number;
  next_tier_name: string | null;
  next_tier_spent: number | null;
}

export function LoyaltyTmaView() {
  const [data, setData] = useState<TmaCustomerData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();

    const initData = WebApp.initData || '';
    if (!initData) {
      if (import.meta.env.DEV) {
        // Mock data for local testing
        setData({
          first_name: 'Test user',
          telegram_id: 12345,
          balance: 1500,
          qr_token: 'test_qr_123',
          tier: 'Gold',
          percent: 10,
          spent_amount: 55000,
          next_tier_name: 'Platinum',
          next_tier_spent: 100000,
        });
        setLoading(false);
      } else {
        setError('No initData found. Please open from Telegram.');
        setLoading(false);
      }
      return;
    }

    // Fetch data using initData
    api<{ error?: string } & TmaCustomerData>('/api/v1/tma/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ initData }),
    })
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Загрузка карты...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Ошибка: {error}</div>;
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-sm mx-auto p-6 flex flex-col items-center">
        <h2 className="text-xl font-bold mb-1">Привет, {data.first_name}!</h2>
        <p className="text-sm text-gray-500 mb-6">Ваша бонусная карта</p>

        <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.1-.96-2.17-1.92H8.01c.09 1.96 1.42 2.87 2.89 3.19V19h1.96v-1.68c1.66-.29 2.82-1.39 2.82-2.95-.01-1.97-1.63-2.61-3.37-3.23z" />
            </svg>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                Ваш статус
              </p>
              <h3 className="text-2xl font-black">{data.tier}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Бонусы</p>
              <h3 className="text-2xl font-black">{data.balance} ₽</h3>
            </div>
          </div>

          {data.next_tier_name && data.next_tier_spent && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold uppercase mb-1 opacity-80">
                <span>Прогресс до {data.next_tier_name}</span>
                <span>{Math.round((data.spent_amount / data.next_tier_spent) * 100)}%</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, (data.spent_amount / data.next_tier_spent) * 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-[10px] mt-2 opacity-70">
                Нужно еще {data.next_tier_spent - data.spent_amount} ₽ покупок для повышения кэшбека
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-xs font-medium">Ваш кэшбек: {data.percent}%</span>
            <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold uppercase">
              Active card
            </span>
          </div>
        </div>

        <div className="bg-white p-2 rounded-xl shadow-sm mb-4">
          <QRCode value={data.qr_token || ''} size={180} level="H" />
        </div>
        <p className="text-xs text-gray-400 mb-6">Покажите этот QR-код на кассе</p>

        <button
          onClick={() => WebApp.close()}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
