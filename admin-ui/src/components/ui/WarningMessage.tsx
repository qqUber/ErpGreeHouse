import { useEffect, useRef } from 'react';

export interface WarningMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function WarningMessage({ message, onDismiss, className = '' }: WarningMessageProps) {
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
      aria-live="polite"
      data-testid="warning-message"
      className={`warning-message ${className}`}
      tabIndex={-1}
    >
      <div className="warning-message-content">
        <span className="warning-message-text">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="warning-message-dismiss"
            aria-label="Dismiss warning message"
            data-testid="warning-message-dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
