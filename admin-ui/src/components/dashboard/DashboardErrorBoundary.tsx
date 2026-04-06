import { Component, type ReactNode } from 'react';
import i18n from '../../i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for dashboard components.
 * Prevents entire dashboard from crashing due to widget errors.
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[DashboardErrorBoundary] Widget error:', error);
    console.error('[DashboardErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Notify parent component if onRetry callback is provided
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '24px',
            margin: '16px',
            background: 'var(--bad-light)',
            border: '1px solid var(--bad)',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--bad)', fontSize: '16px' }}>
            {i18n.t('errors.boundaryTitle')}
          </h3>
          <p style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '14px' }}>
            {i18n.t('errors.boundaryDescription')}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              background: 'var(--bad)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {i18n.t('errors.boundaryRetry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
