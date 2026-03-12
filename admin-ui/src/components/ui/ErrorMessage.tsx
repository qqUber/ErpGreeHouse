import { useEffect, useRef } from 'react';

export interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onDismiss, className = '' }: ErrorMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.focus();
    }
  }, []);

  return (
    <div
      ref={messageRef}
      role="alert"
      aria-live="assertive"
      data-testid="error-message"
      className={`error-message ${className}`}
      tabIndex={-1}
    >
      <div className="error-message-content">
        <span className="error-message-text">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="error-message-dismiss"
            aria-label="Dismiss error message"
            data-testid="error-message-dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
