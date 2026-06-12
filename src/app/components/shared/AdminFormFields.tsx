export function FormField({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
        {label}{req && <span style={{ color: '#E63946' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary transition-colors ${props.className ?? ''}`}
      style={{ background: '#F9FAFB', fontSize: 14, color: '#111827', ...props.style }}
    />
  );
}
