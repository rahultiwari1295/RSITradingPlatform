import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("QuantSync React ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#07080D',
          color: '#F4F5F9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Terminal Runtime Notification</h2>
          <p style={{ fontSize: 12, color: '#9AA0B4', maxWidth: 420, lineHeight: 1.6, marginBottom: 16 }}>
            {this.state.error?.message || "An unexpected error occurred while rendering the terminal."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: '#6366F1',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Reload Platform
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
