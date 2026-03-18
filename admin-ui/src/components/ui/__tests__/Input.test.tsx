import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../Input';
import '../Input.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('Input', () => {
  it('renders input field', () => {
    renderWithI18n(<Input />);
    expect(screen.getByTestId('input-field')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    renderWithI18n(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    renderWithI18n(<Input label="Email" required />);
    expect(screen.getByLabelText('required')).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    renderWithI18n(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error class when error is present', () => {
    renderWithI18n(<Input error="Error" />);
    const input = screen.getByTestId('input-field');
    expect(input).toHaveClass('input-error');
  });

  it('renders helper text when provided', () => {
    renderWithI18n(<Input helperText="Enter your email address" />);
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('prioritizes error over helper text', () => {
    renderWithI18n(<Input error="Error message" helperText="Helper text" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('applies fullWidth class when fullWidth is true', () => {
    renderWithI18n(<Input fullWidth />);
    const wrapper = screen.getByTestId('input-field').parentElement;
    expect(wrapper).toHaveClass('input-wrapper-full');
  });

  it('sets aria-invalid when error is present', () => {
    renderWithI18n(<Input error="Error" />);
    const input = screen.getByTestId('input-field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('links error message with aria-describedby', () => {
    renderWithI18n(<Input error="Error message" />);
    const input = screen.getByTestId('input-field');
    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('Error message')).toHaveAttribute('id', errorId);
  });

  it('accepts value and onChange', () => {
    const onChange = vi.fn();
    renderWithI18n(<Input value="test" onChange={onChange} />);
    const input = screen.getByTestId('input-field') as HTMLInputElement;
    expect(input.value).toBe('test');

    fireEvent.change(input, { target: { value: 'new value' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithI18n(<Input disabled />);
    const input = screen.getByTestId('input-field');
    expect(input).toBeDisabled();
  });

  it('applies custom className to wrapper', () => {
    renderWithI18n(<Input className="custom-class" />);
    const wrapper = screen.getByTestId('input-field').parentElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('accepts different input types', () => {
    renderWithI18n(<Input type="password" />);
    const input = screen.getByTestId('input-field');
    expect(input).toHaveAttribute('type', 'password');
  });
});
