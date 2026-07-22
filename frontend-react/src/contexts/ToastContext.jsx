import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

let _id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Helper shortcuts
  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error',   dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info:    (msg, dur) => addToast(msg, 'info',    dur),
  };

  const icons = {
    success: 'check_circle',
    error:   'cancel',
    warning: 'warning',
    info:    'info',
  };

  const colors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#15803d', bar: '#22c55e' },
    error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#b91c1c', bar: '#ef4444' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#b45309', bar: '#f59e0b' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1d4ed8', bar: '#3b82f6' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '320px',
          maxWidth: '420px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(({ id, message, type }) => {
          const c = colors[type] || colors.info;
          return (
            <div
              key={id}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                pointerEvents: 'all',
                animation: 'toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Animated bar */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0,
                height: '3px',
                width: '100%',
                background: c.bar,
                borderRadius: '0 0 16px 16px',
                animation: 'toastProgress 3.5s linear forwards',
              }} />

              {/* Icon */}
              <span
                className="material-symbols-outlined"
                style={{ color: c.icon, fontSize: '22px', flexShrink: 0, marginTop: '1px', fontVariationSettings: '"FILL" 1' }}
              >
                {icons[type]}
              </span>

              {/* Message */}
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 500,
                color: c.text,
                lineHeight: '1.5',
                flex: 1,
                whiteSpace: 'pre-line',
              }}>
                {message}
              </p>

              {/* Close */}
              <button
                onClick={() => removeToast(id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: c.icon,
                  opacity: 0.6,
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastProgress {
          from { transform: scaleX(1); transform-origin: left; }
          to   { transform: scaleX(0); transform-origin: left; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
