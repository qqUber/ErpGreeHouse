import { useState } from 'react';
import { Api } from './api';
import { ConsentTable } from './components/ConsentTable';
import { ProfileDeletion } from './components/ProfileDeletion';

export function ComplianceView() {
  const [tab, setTab] = useState<'consents' | 'delete'>('consents');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Комплаенс</h1>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        <button
          className={`pb-2 px-1 ${tab === 'consents' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('consents')}
        >
          Согласия
        </button>
        <button
          className={`pb-2 px-1 ${tab === 'delete' ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('delete')}
        >
          Удаление профилей
        </button>
      </div>

      {tab === 'consents' && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Регистрация согласий</h2>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <ConsentTable customerId={selectedCustomerId} />
          </div>
        </div>
      )}

      {tab === 'delete' && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Удаление профиля пользователя</h2>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Введите ID пользователя для удаления:
              </label>
              <input
                type="number"
                placeholder="ID пользователя"
                className="p-2 border border-gray-300 rounded-md w-full"
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