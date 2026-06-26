export function agentContribution(faceValue: number, subsidy: number): number {
  return Math.round((faceValue - subsidy) * 100) / 100;
}

export function validateTicketAmounts(faceValue: number, subsidy: number): string | null {
  if (!Number.isFinite(faceValue) || faceValue <= 0) {
    return 'La valeur faciale doit être supérieure à 0 €';
  }
  if (!Number.isFinite(subsidy) || subsidy < 0) {
    return 'La subvention doit être un montant positif ou nul';
  }
  if (subsidy > faceValue) {
    return 'La subvention ne peut pas dépasser la valeur faciale';
  }
  return null;
}

export function pickPositiveAmount(...candidates: (number | undefined | null)[]): number | null {
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function resolveTicketAmounts(
  sources: { faceValue?: number; subsidy?: number }[],
  defaults: { faceValue: number; subsidy: number },
): { faceValue: number; subsidy: number } {
  const faceValue = pickPositiveAmount(...sources.map(s => s.faceValue)) ?? defaults.faceValue;
  const rawSubsidy = sources.map(s => s.subsidy).find(v => Number.isFinite(Number(v))) ?? defaults.subsidy;
  const subsidy = Math.min(Math.max(0, Number(rawSubsidy)), faceValue);
  return { faceValue, subsidy };
}
