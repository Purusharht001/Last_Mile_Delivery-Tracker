import { Component, ErrorInfo, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI; receives the error for display. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors in its subtree and shows a fallback instead of
 * crashing the whole app. Particularly important around the three.js 3D
 * scene which can fail on unsupported GPUs / WebGL contexts.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return <DefaultFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-4 p-8 text-center",
      "rounded-2xl border border-destructive/30 bg-destructive/5 backdrop-blur-lg",
    )}>
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <p className="max-w-md text-xs text-muted-foreground">{error.message}</p>
      <button
        onClick={onReset}
        className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
