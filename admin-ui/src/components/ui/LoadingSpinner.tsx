export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinnerContent = (
    <div className={`loading-spinner-container ${fullScreen ? 'fullscreen' : ''} ${className}`}>
      <div
        className={`spinner spinner-${size}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-testid="loading-spinner"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {message && <p className="loading-spinner-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner-overlay" data-testid="loading-spinner-overlay">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}
