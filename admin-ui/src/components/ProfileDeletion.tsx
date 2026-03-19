import { useState } from 'react';
import { Api } from '../api';

interface FeedbackMessage {
  kind: 'success' | 'error';
  message: string;
}

export function ProfileDeletion({
  customerId,
  onDeleted,
}: {
  customerId: number;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  async function handleDelete() {
    if (confirmText !== 'УДАЛИТЬ') {
      setFeedback({
        kind: 'error',
        message: 'Пожалуйста, введите "УДАЛИТЬ" для подтверждения',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await Api.deleteCustomer(customerId);
      setFeedback({ kind: 'success', message: 'Профиль пользователя успешно удален' });
      onDeleted();
    } catch (e) {
      console.error(e);
      setFeedback({ kind: 'error', message: 'Ошибка при удалении профиля пользователя' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-red-50 p-6 rounded-lg">
      <h3 className="text-lg font-medium text-red-800 mb-4">Удаление профиля пользователя</h3>

      <div className="mb-4">
        <p className="text-red-700 mb-2">
          Это действие нельзя отменить. Все данные пользователя будут permanently удалены из
          системы.
        </p>
        <p className="text-sm text-red-600">Введите "УДАЛИТЬ" для подтверждения:</p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-2 p-2 border border-red-300 rounded-md w-full"
          placeholder="Введите УДАЛИТЬ"
        />
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            feedback.kind === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <button
        onClick={handleDelete}
        disabled={loading || confirmText !== 'УДАЛИТЬ'}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Удаление...' : 'Удалить профиль'}
      </button>
    </div>
  );
}
