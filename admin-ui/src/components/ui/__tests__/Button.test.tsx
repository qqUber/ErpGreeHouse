import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import '../Button.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('Button', () => {
  it('renders button with children', () => {
    renderWithI18n(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders primary variant by default', () => {
    renderWithI18n(<Button>Primary</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toHaveClass('button-primary');
  });

  it('renders secondary variant', () => {
    renderWithI18n(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByTestId('button-secondary');
    expect(button).toHaveClass('button-secondary');
  });

  it('renders danger variant', () => {
    renderWithI18n(<Button variant="danger">Danger</Button>);
    const button = screen.getByTestId('button-danger');
    expect(button).toHaveClass('button-danger');
  });

  it('renders outline variant', () => {
    renderWithI18n(<Button variant="outline">Outline</Button>);
    const button = screen.getByTestId('button-outline');
    expect(button).toHaveClass('button-outline');
  });

  it('renders ghost variant', () => {
    renderWithI18n(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByTestId('button-ghost');
    expect(button).toHaveClass('button-ghost');
  });

  it('renders small size', () => {
    renderWithI18n(<Button size="sm">Small</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toHaveClass('button-sm');
  });

  it('renders medium size by default', () => {
    renderWithI18n(<Button>Medium</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toHaveClass('button-md');
  });

  it('renders large size', () => {
    renderWithI18n(<Button size="lg">Large</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toHaveClass('button-lg');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderWithI18n(<Button onClick={onClick}>Click me</Button>);

    const button = screen.getByTestId('button-primary');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    renderWithI18n(<Button disabled>Disabled</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toBeDisabled();
  });

  it('shows loading state', () => {
    renderWithI18n(<Button isLoading>Loading</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toHaveClass('button-loading');
    expect(button).toBeDisabled();
  });

  it('does not call onClick when loading', () => {
    const onClick = vi.fn();
    renderWithI18n(
      <Button isLoading onClick={onClick}>
        Loading
      </Button>
    );

    const button = screen.getByTestId('button-primary');
    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    renderWithI18n(<Button className="custom-class">Custom</Button>);
    const button = screen.getByTestId('button-primary');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('button');
  });
});
