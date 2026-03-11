import { useTranslation } from 'react-i18next';

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (total <= limit) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: (number | string)[] = [];

  // Always show first page
  pages.push(1);

  // Add ellipsis and surrounding pages
  if (page > 3) {
    pages.push('...');
  }

  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  if (page < totalPages - 2) {
    pages.push('...');
  }

  // Always show last page if more than 1 page
  if (totalPages > 1 && !pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return (
    <div className="pagination" data-testid="pagination">
      <div className="pagination-info">{t('pagination.showing', { start, end, total })}</div>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          data-testid="pagination-prev"
        >
          ← {t('pagination.prev')}
        </button>

        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              data-testid={`pagination-page-${p}`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="pagination-ellipsis">
              {p}
            </span>
          )
        )}

        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          data-testid="pagination-next"
        >
          {t('pagination.next')} →
        </button>
      </div>
    </div>
  );
}
