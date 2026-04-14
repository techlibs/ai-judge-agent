"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ChainErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">
            Data loading error
          </h3>
          <p className="mt-1 text-sm text-red-700">
            Unable to load on-chain or IPFS data. This may be a temporary
            network issue.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-500"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
