import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null; info: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack || '' });
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#0a0a0f', color: '#f87171', padding: 20,
          fontFamily: 'monospace', fontSize: 13, minHeight: '100dvh',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          <h2 style={{ color: '#f59e0b', marginBottom: 12 }}>App Crashed</h2>
          <div style={{ color: '#e2e8f0', marginBottom: 8 }}>
            {this.state.error.message}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11 }}>
            {this.state.error.stack}
          </div>
          {this.state.info && (
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 12 }}>
              {this.state.info}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
