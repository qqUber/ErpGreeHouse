import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  accessor?: (item: T) => any;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage,
  isLoading = false,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data];
  if (sortColumn && sortDirection) {
    const column = columns.find((col) => col.key === sortColumn);
    if (column) {
      sortedData.sort((a, b) => {
        const aValue = column.accessor ? column.accessor(a) : (a as any)[sortColumn];
        const bValue = column.accessor ? column.accessor(b) : (b as any)[sortColumn];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }
  }

  if (isLoading) {
    return (
      <div className={`data-table-loading ${className}`} data-testid="data-table-loading">
        <span>{t('common.loading') || 'Loading...'}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`data-table-empty ${className}`} data-testid="data-table-empty">
        <span>{emptyMessage || t('common.noData') || 'No data available'}</span>
      </div>
    );
  }

  return (
    <div className={`data-table-wrapper ${className}`}>
      <table className="data-table" data-testid="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`data-table-header ${column.sortable ? 'sortable' : ''}`}
                onClick={() => column.sortable && handleSort(column.key)}
                aria-sort={
                  sortColumn === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                data-testid={`data-table-header-${column.key}`}
              >
                <div className="data-table-header-content">
                  {column.header}
                  {column.sortable && (
                    <span className="data-table-sort-icon" aria-hidden="true">
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          '↑'
                        ) : (
                          '↓'
                        )
                      ) : (
                        '↕'
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => {
            const key = keyExtractor(item);
            if (key === null || key === undefined || Number.isNaN(key)) {
              console.warn('[DataTable] Invalid key from keyExtractor:', key, item);
            }
            return (
              <tr
                key={String(key)}
                className={`data-table-row ${onRowClick ? 'clickable' : ''}`}
                onClick={() => onRowClick?.(item)}
                data-testid={`data-table-row-${key}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="data-table-cell"
                    data-testid={`data-table-cell-${column.key}`}
                  >
                    {column.render
                      ? column.render(item)
                      : column.accessor
                        ? String(column.accessor(item) ?? '')
                        : String((item as any)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
