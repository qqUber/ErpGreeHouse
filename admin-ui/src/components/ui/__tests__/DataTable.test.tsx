import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import type { DataTableColumn } from '../DataTable';
import { DataTable } from '../DataTable';
import '../DataTable.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        common: {
          loading: 'Loading...',
          noData: 'No data available',
        },
      },
    },
  },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

interface TestItem {
  id: number;
  name: string;
  age: number;
}

const mockData: TestItem[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 },
];

const mockColumns: DataTableColumn<TestItem>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'age', header: 'Age', sortable: true },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={(item) => item.id} />
    );
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={(item) => item.id} />
    );
    expect(screen.getByTestId('data-table-header-name')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-header-age')).toBeInTheDocument();
  });

  it('renders rows with correct testids', () => {
    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={(item) => item.id} />
    );
    expect(screen.getByTestId('data-table-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-row-3')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithI18n(
      <DataTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        isLoading={true}
      />
    );
    expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    renderWithI18n(<DataTable data={[]} columns={mockColumns} keyExtractor={(item) => item.id} />);
    expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    renderWithI18n(
      <DataTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        emptyMessage="No items found"
      />
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('sorts ascending when clicking sortable header', () => {
    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={(item) => item.id} />
    );

    const nameHeader = screen.getByTestId('data-table-header-name');
    fireEvent.click(nameHeader);

    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts descending when clicking sortable header twice', () => {
    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={(item) => item.id} />
    );

    const nameHeader = screen.getByTestId('data-table-header-name');
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);

    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('clears sort when clicking sortable header three times', () => {
    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={(item) => item.id} />
    );

    const nameHeader = screen.getByTestId('data-table-header-name');
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);

    expect(nameHeader).not.toHaveAttribute('aria-sort');
  });

  it('does not sort non-sortable columns', () => {
    const columns: DataTableColumn<TestItem>[] = [{ key: 'name', header: 'Name', sortable: false }];

    renderWithI18n(
      <DataTable data={mockData} columns={columns} keyExtractor={(item) => item.id} />
    );

    const nameHeader = screen.getByTestId('data-table-header-name');
    fireEvent.click(nameHeader);

    expect(nameHeader).not.toHaveAttribute('aria-sort');
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    renderWithI18n(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        onRowClick={onRowClick}
      />
    );

    const row = screen.getByTestId('data-table-row-1');
    fireEvent.click(row);

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('renders custom cell content with render function', () => {
    const columnsWithRender: DataTableColumn<TestItem>[] = [
      {
        key: 'name',
        header: 'Name',
        render: (item) => <strong>{item.name}</strong>,
      },
    ];

    renderWithI18n(
      <DataTable data={mockData} columns={columnsWithRender} keyExtractor={(item) => item.id} />
    );

    const strong = screen.getByText('Alice').closest('strong');
    expect(strong).toBeInTheDocument();
  });

  it('uses accessor function when provided', () => {
    const columnsWithAccessor: DataTableColumn<TestItem>[] = [
      {
        key: 'displayName',
        header: 'Display Name',
        accessor: (item) => `${item.name} (${item.age})`,
      },
    ];

    renderWithI18n(
      <DataTable data={mockData} columns={columnsWithAccessor} keyExtractor={(item) => item.id} />
    );

    expect(screen.getByText('Alice (30)')).toBeInTheDocument();
  });

  it('warns about invalid keys from keyExtractor', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithI18n(
      <DataTable data={mockData} columns={mockColumns} keyExtractor={() => null as any} />
    );

    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('applies custom className', () => {
    renderWithI18n(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        className="custom-table"
      />
    );

    const wrapper = screen.getByTestId('data-table').parentElement;
    expect(wrapper).toHaveClass('custom-table');
  });
});
