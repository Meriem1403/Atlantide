import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { FilterSelect } from './FilterSelect';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, size = 'md', footer }: Props) {
  const maxW = size === 'sm' ? 400 : size === 'lg' ? 720 : 560;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card w-full rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: maxW, maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Btn({
  children, onClick, variant = 'primary', disabled = false, type = 'button', className = ''
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#0071E3', color: 'white' },
    secondary: { background: '#E8E8ED', color: '#1D1D1F' },
    danger: { background: '#FF3B30', color: 'white' },
    ghost: { background: 'transparent', color: '#0071E3', border: '1px solid #0071E3' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 ${className}`}
      style={{ fontSize: 14, fontWeight: 600, ...styles[variant] }}
    >
      {children}
    </button>
  );
}

export function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>
        {label}{required && <span style={{ color: '#FF3B30' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary transition-colors"
      style={{ background: '#F5F5F7', fontSize: 14, color: '#1D1D1F', ...props.style }}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FilterSelect variant="modal" {...props}>
      {children}
    </FilterSelect>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary transition-colors resize-none"
      style={{ background: '#F5F5F7', fontSize: 14, color: '#1D1D1F', ...props.style }}
    />
  );
}

export function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'orange' | 'red' | 'gray' }) {
  const map = {
    green: { bg: '#EDFBF1', text: '#34C759' },
    blue: { bg: '#EBF5FF', text: '#0071E3' },
    orange: { bg: '#FFF6EB', text: '#FF9500' },
    red: { bg: '#FFF0EF', text: '#FF3B30' },
    gray: { bg: '#F5F5F7', text: '#6E6E73' },
  };
  const c = map[color];
  return (
    <span className="inline-block px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}
