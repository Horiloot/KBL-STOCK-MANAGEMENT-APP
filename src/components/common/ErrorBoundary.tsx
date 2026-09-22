import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  key?: React.Key;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Unhandled runtime exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[420px] w-full flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            {/* Warning Icon Badge */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 mb-4 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Title & Message */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
              Something went wrong loading this view
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
              An unexpected runtime error occurred in this module. The application state remains intact. You can retry rendering or return to the dashboard.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-xs transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => {
                  this.handleReset();
                  window.location.href = '#dashboard';
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>

              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <span>Reload Page</span>
              </button>
            </div>

            {/* Collapsible Error Details for debugging */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
              <button
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>{this.state.showDetails ? 'Hide technical details' : 'Show technical error details'}</span>
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-rose-600 dark:text-rose-400 overflow-x-auto max-h-48">
                  <p className="font-semibold mb-1">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[11px] text-slate-500 dark:text-slate-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
