import { ChevronLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
  maxWidth?: '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

const MAX: Record<string, string> = {
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
};

export function AdminPageHeader({ title, subtitle, backLabel, onBack }: Omit<Props, 'children' | 'maxWidth'>) {
  return (
    <div className="px-6 lg:px-10 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 mb-3 hover:opacity-70 transition-opacity" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
          <ChevronLeft className="w-4 h-4" />{backLabel}
        </button>
      )}
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

export function AdminFormLayout({ title, subtitle, backLabel, onBack, children, maxWidth = '4xl' }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <AdminPageHeader title={title} subtitle={subtitle} backLabel={backLabel} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className={`${MAX[maxWidth]} w-full mx-auto`}>{children}</div>
      </div>
    </div>
  );
}
