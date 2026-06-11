import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, perPage, onChange }: Props) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between gap-2 mt-4">
      <p style={{ fontSize: 12, color: '#6E6E73' }}>
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-card hover:bg-accent disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ fontSize: 13, color: '#6E6E73', width: 32, textAlign: 'center' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
              style={{
                fontSize: 13, fontWeight: page === p ? 700 : 400,
                background: page === p ? '#0071E3' : 'white',
                color: page === p ? 'white' : '#1D1D1F',
                border: `1px solid ${page === p ? '#0071E3' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-card hover:bg-accent disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
