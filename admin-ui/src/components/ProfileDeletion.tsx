import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  async function handleDelete() {
    const confirmWord = t('compliance.confirmDeleteWord');
    if (confirmText !== confirmWord) {
      setFeedback({
        kind: 'error',
        message: t('compliance.confirmDeleteRequired'),
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await Api.deleteCustomer(customerId);
      setFeedback({ kind: 'success', message: t('compliance.profileDeletedSuccessfully') });
      onDeleted();
    } catch (e) {
      console.error(e);
      setFeedback({ kind: 'error', message: t('compliance.profileDeleteError') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-red-50 p-6 rounded-lg">
      <h3 className="text-lg font-medium text-red-800 mb-4">
        {t('compliance.userProfileDeletion')}
      </h3>

      <div className="mb-4">
        <p className="text-red-700 mb-2">{t('compliance.cannotBeUndone')}</p>
        <p className="text-sm text-red-600">{t('compliance.enterDeleteToConfirm')}:</p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-2 p-2 border border-red-300 rounded-md w-full"
          placeholder={t('compliance.enterDelete')}
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
        disabled={loading || confirmText !== t('compliance.confirmDeleteWord')}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t('compliance.deleting') : t('compliance.deleteProfile')}
      </button>
    </div>
  );
}
