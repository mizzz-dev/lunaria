
type Status = 'online' | 'offline' | 'warning' | 'unknown';

const statusClasses: Record<Status, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-zinc-600',
  warning: 'bg-amber-400',
  unknown: 'bg-zinc-500',
};

interface StatusDotProps {
  status: Status;
  className?: string;
}

export function StatusDot({ status, className = '' }: StatusDotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${statusClasses[status]} ${className}`}
      aria-label={status}
    />
  );
}
