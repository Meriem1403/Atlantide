export function agentContribution(faceValue, subsidy) {
  return Math.round((Number(faceValue) - Number(subsidy)) * 100) / 100;
}

export function validateTicketAmounts(faceValue, subsidy) {
  const face = Number(faceValue);
  const sub = Number(subsidy);

  if (!Number.isFinite(face) || face <= 0) {
    return 'La valeur faciale doit être supérieure à 0 €';
  }
  if (!Number.isFinite(sub) || sub < 0) {
    return 'La subvention doit être un montant positif ou nul';
  }
  if (sub > face) {
    return 'La subvention ne peut pas dépasser la valeur faciale';
  }
  return null;
}

export function pickPositiveAmount(...candidates) {
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
