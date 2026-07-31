import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { message: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(e: unknown): State {
    return { message: e instanceof Error ? e.message : String(e) };
  }

  componentDidCatch(e: Error, info: ErrorInfo): void {
    console.error('UI crash', e, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div role="alert" className="m-4 rounded-2xl border p-5 text-sm"
           style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-2 font-medium">Интерфейс упал</p>
        <p className="mb-4 break-words" style={{ color: 'var(--tx2)' }}>{this.state.message}</p>
        <button className="rounded-xl px-4 py-2 text-white" style={{ background: 'var(--color-ac)' }}
                onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </div>
    );
  }
}
