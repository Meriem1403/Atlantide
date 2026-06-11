import { Calendar, ChevronDown } from 'lucide-react';

type Variant = 'filter' | 'form' | 'modal';

const variantStyles: Record<Variant, React.CSSProperties> = {
  filter: { background: 'white', fontSize: 13 },
  form: { background: '#F9FAFB', fontSize: 14 },
  modal: { background: '#F5F5F7', fontSize: 14 },
};

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: Variant;
  wrapperClassName?: string;
}

export function FilterSelect({
  variant = 'filter',
  className = '',
  wrapperClassName = '',
  style,
  children,
  ...props
}: FilterSelectProps) {
  return (
    <div className={`relative w-full min-w-0 ${wrapperClassName}`}>
      <select
        {...props}
        className={`w-full min-w-0 max-w-full appearance-none rounded-xl border border-border pl-3 pr-9 py-2.5 outline-none focus:border-primary transition-colors truncate ${className}`}
        style={{ color: '#1D1D1F', ...variantStyles[variant], ...style }}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0"
        aria-hidden
      />
    </div>
  );
}

export function MonthInput({
  variant = 'form',
  className = '',
  wrapperClassName = '',
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { variant?: Variant; wrapperClassName?: string }) {
  return (
    <div className={`relative w-full min-w-0 ${wrapperClassName}`}>
      <input
        type="month"
        {...props}
        className={`w-full min-w-0 max-w-full appearance-none rounded-xl border border-border pl-3 pr-9 py-2.5 outline-none focus:border-primary transition-colors ${className}`}
        style={{ color: '#1D1D1F', ...variantStyles[variant], ...style }}
      />
      <Calendar
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0"
        aria-hidden
      />
    </div>
  );
}
