export function uniqueMonths(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function resolvePrimaryMonth(
  tickets: { month: string }[],
  monthlyPlans?: { month: string }[],
): string {
  const fromTickets = uniqueMonths(tickets.map(t => t.month));
  if (fromTickets.length) return fromTickets[fromTickets.length - 1];
  const fromPlans = uniqueMonths((monthlyPlans ?? []).map(p => p.month));
  if (fromPlans.length) return fromPlans[fromPlans.length - 1];
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function chartMonths(primaryMonth: string, ticketMonths: string[], count = 3): string[] {
  const all = uniqueMonths([...ticketMonths, primaryMonth]);
  if (!all.length) return [primaryMonth];
  const endIdx = all.indexOf(primaryMonth);
  const slice = all.slice(Math.max(0, endIdx - count + 1), endIdx + 1);
  return slice.length ? slice : [primaryMonth];
}

export function formatMonthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  return new Date(`${month}-15`).toLocaleDateString('fr-FR', {
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}
