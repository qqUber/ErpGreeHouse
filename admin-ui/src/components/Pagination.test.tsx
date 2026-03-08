import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Mock i18next
i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          pagination: {
            showing: 'Showing {{start}} to {{end}} of {{total}}',
            prev: 'Prev',
            next: 'Next',
          },
        },
      },
    },
    debug: false,
  });

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('Pagination Component', () => {
  it('should not render if total items <= limit', () => {
    const onPageChange = vi.fn();
    const { container } = renderWithI18n(
      <Pagination 
        page={1} 
        totalPages={1} 
        total={10} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render pagination with correct info', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={2} 
        totalPages={5} 
        total={50} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    expect(screen.getByText('Showing 11 to 20 of 50')).toBeInTheDocument();
  });

  it('should render all page numbers when there are few pages', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={1} 
        totalPages={3} 
        total={30} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    expect(screen.getByTestId('pagination-page-1')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-page-2')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-page-3')).toBeInTheDocument();
  });

  it('should render ellipsis when there are many pages', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={5} 
        totalPages={10} 
        total={100} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    const ellipsisElements = document.querySelectorAll('.pagination-ellipsis');
    expect(ellipsisElements.length).toBeGreaterThan(0);
  });

  it('should call onPageChange when clicking a page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={1} 
        totalPages={5} 
        total={50} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    fireEvent.click(screen.getByTestId('pagination-page-2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('should disable prev button on first page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={1} 
        totalPages={5} 
        total={50} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={5} 
        totalPages={5} 
        total={50} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
  });

  it('should call onPageChange when clicking prev', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={2} 
        totalPages={5} 
        total={50} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    fireEvent.click(screen.getByTestId('pagination-prev'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when clicking next', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination 
        page={2} 
        totalPages={5} 
        total={50} 
        limit={10} 
        onPageChange={onPageChange} 
      />
    );
    
    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
