import { Shield } from 'lucide-react';

interface Props {
  src?: string;
  alt?: string;
  size?: number;
  shape?: 'square' | 'banner';
  className?: string;
  fallbackClassName?: string;
  onDark?: boolean;
}

export function OrgLogo({ src, alt = 'Logo', size = 40, shape = 'square', className = '', fallbackClassName = '', onDark = false }: Props) {
  const box = shape === 'banner'
    ? { width: Math.round(size * 2.4), height: size, minWidth: Math.round(size * 2.4), minHeight: size }
    : { width: size, height: size, minWidth: size, minHeight: size };

  if (src) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl shrink-0 ${className}`}
        style={{
          ...box,
          background: onDark ? 'rgba(255,255,255,0.15)' : '#F3F4F6',
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{ maxWidth: '88%', maxHeight: '88%', width: 'auto', height: 'auto', objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl shrink-0 ${fallbackClassName}`}
      style={{
        ...box,
        background: onDark ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #4361EE, #6B8EFF)',
      }}
    >
      <Shield className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
