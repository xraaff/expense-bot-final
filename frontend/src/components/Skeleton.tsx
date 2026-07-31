export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'var(--s2)', minHeight: '1rem' }}
    />
  );
}
