import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          color: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#000',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#000',
          },
        },
      }}
    />
  );
}
