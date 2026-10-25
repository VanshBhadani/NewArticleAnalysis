import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside component tree:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white border border-red-200 brutal-card rounded-none p-6 text-ink space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 border border-red-300 text-crimson">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-ink">
                {this.props.fallbackTitle || 'Component Rendering Interrupted'}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                The interface encountered an unhandled exception while updating this section.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 bg-[#F4F4F0] border border-border-light text-[11px] font-mono text-ink-secondary overflow-x-auto">
              {this.state.error.message}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={this.handleReset}
              className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-xs font-semibold tracking-wide uppercase"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Component View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
