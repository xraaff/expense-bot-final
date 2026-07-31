import '@testing-library/jest-dom/vitest';

// jsdom не реализует ResizeObserver, а recharts ResponsiveContainer его требует.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
