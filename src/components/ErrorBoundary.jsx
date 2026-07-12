import { Component } from 'react';

/**
 * Global Error Boundary — catches any unhandled JS error thrown inside the
 * React tree and shows a user-friendly fallback instead of a blank page.
 *
 * Usage: wrap <App /> in main.jsx with <ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production you could send this to a logging service (e.g. Sentry)
    console.error('[ErrorBoundary] Unhandled error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Flame / error icon */}
          <div className="text-6xl mb-6">🔥</div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Kuch toh gadbad ho gayi!
          </h1>
          <p className="text-[#B08850] mb-6 text-sm leading-relaxed">
            Ek unexpected error aa gaya. Ghabraiye mat — aapka cart safe hai.
            Page ko reload karein, sab theek ho jayega.
          </p>

          {/* Error details (collapsed, for debugging) */}
          {this.state.error && (
            <details className="mb-6 text-left">
              <summary className="text-[#B08850]/60 text-xs cursor-pointer hover:text-[#B08850] transition-colors">
                Technical details
              </summary>
              <pre className="mt-2 text-[10px] text-red-400/80 bg-white/5 rounded p-3 overflow-auto max-h-32 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReload}
            className="bg-[#B08850] hover:bg-[#C49A60] text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Homepage par wapas jao
          </button>
        </div>
      </div>
    );
  }
}
