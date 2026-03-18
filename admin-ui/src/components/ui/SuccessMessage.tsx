import { useEffect, useRef, useState } from 'react';

export interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
  autoHideDuration?: number;
}

export function SuccessMessage({
  message,
  onDismiss,
  className = '',
  autoHideDuration,
}: SuccessMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);
  const [isVisible, setIsVisible] = useState(true);

  // Keep ref in sync with latest callback
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (autoHideDuration && onDismissRef.current) {
      let isMounted = true;

      const timer = setTimeout(() => {
        if (isMounted) {
          setIsVisible(false);
          onDismissRef.current?.();
        }
      }, autoHideDuration);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [autoHideDuration]);

  if (!isVisible) return null;

  return (
    <div
      ref={messageRef}
      role="status"
      aria-live="polite"
      data-testid="success-message"
      className={`success-message ${className}`}
      tabIndex={-1}
    >
      <div className="success-message-content">
        <span className="success-message-text">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="success-message-dismiss"
            aria-label="Dismiss success message"
            data-testid="success-message-dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
