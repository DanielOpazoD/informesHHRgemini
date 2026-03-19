import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 shadow-xl dark:border-red-900 dark:bg-slate-800 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Algo salió mal</h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              La aplicación ha detectado un error inesperado al renderizar el contenido.
            </p>
            <div className="mb-6 overflow-hidden rounded bg-slate-100 p-3 text-left text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400 max-h-32 overflow-y-auto">
                <code className="font-mono">{this.state.error?.message || 'Error desconocido'}</code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:hover:bg-indigo-500"
            >
              Recargar la página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
