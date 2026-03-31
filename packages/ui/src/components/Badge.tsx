
type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';

const variantClasses: Record<Variant, string> = {
  default: 'bg-zinc-700 text-zinc-200',
  success: 'bg-emerald-900/60 text-emerald-300',
  warning: 'bg-amber-900/60 text-amber-300',
  error: 'bg-red-900/60 text-red-300',
  info: 'bg-blue-900/60 text-blue-300',
  muted: 'bg-zinc-800 text-zinc-500',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
