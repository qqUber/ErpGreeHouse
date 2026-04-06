import { Component, ErrorInfo, ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * Or with custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="error-fallback min-h-screen flex items-center justify-center bg-gray-100">
      <div className="error-fallback-card bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="error-fallback-icon flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
          {t('errors.boundaryTitle')}
        </h2>

        <p className="text-gray-600 text-center mb-6">{t('errors.boundaryDescription')}</p>

        {error && (
          <details className="mb-4 p-3 bg-gray-50 rounded text-sm">
            <summary className="cursor-pointer text-gray-500 font-medium">
              {t('errors.boundaryDetails')}
            </summary>
            <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-32">{error.message}</pre>
          </details>
        )}

        <div className="error-fallback-actions flex gap-3">
          <button
            onClick={onRetry}
            className="error-fallback-btn error-fallback-btn-primary flex-1 bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            {t('errors.boundaryRetry')}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="error-fallback-btn error-fallback-btn-secondary flex-1 bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition-colors"
          >
            {t('errors.boundaryReload')}
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
