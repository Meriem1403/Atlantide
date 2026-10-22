import { useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
      } catch {
        // Le navigateur refuse showPicker hors geste utilisateur.
      }
    }
  };

  return (
    <div className={`relative w-full min-w-0 ${wrapperClassName}`}>
      <input
        ref={inputRef}
        type="month"
        {...props}
        onClick={(e) => {
          props.onClick?.(e);
          if (!e.defaultPrevented) openPicker();
        }}
        className={`month-input w-full min-w-0 max-w-full rounded-xl border border-border pl-3 pr-9 py-2.5 outline-none focus:border-primary transition-colors cursor-pointer ${className}`}
        style={{ color: '#1D1D1F', ...variantStyles[variant], ...style }}
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Choisir le mois"
      >
        <Calendar className="w-4 h-4" />
      </button>
    </div>
  );
}
