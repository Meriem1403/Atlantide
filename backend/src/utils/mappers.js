export function mapAgent(row) {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    email: row.email,
    phone: row.phone,
    code: row.code,
    numerotation: row.numerotation ?? '',
    notes: row.notes ?? '',
    active: row.active,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export function mapMonthlyPlan(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    month: row.month,
    serviceName: row.service_name,
    ticketCount: row.ticket_count,
    faceValue: Number(row.face_value),
    subsidy: Number(row.subsidy),
    numerotation: row.numerotation ?? '',
    notes: row.notes ?? '',
  };
}

export function mapProvider(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    siret: row.siret,
    email: row.email,
    phone: row.phone,
    active: row.active,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

function parseAppliesTo(value) {
  if (value == null || value === '') return 'all';
  if (typeof value !== 'string') return value;
  if (value === 'all') return 'all';
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function mapSubvention(row) {
  const appliesTo = parseAppliesTo(row.applies_to);
  return {
    id: row.id,
    label: row.label,
    faceValue: Number(row.face_value),
    subsidy: Number(row.subsidy),
    ticketsPerMonth: row.tickets_per_month,
    appliesTo,
    active: row.active,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export function mapTicket(row) {
  return {
    id: row.id,
    number: row.number,
    agentId: row.agent_id,
    agentName: row.agent_name,
    month: row.month,
    faceValue: Number(row.face_value),
    subsidy: Number(row.subsidy),
    agentContribution: Number(row.agent_contribution),
    status: row.status,
    generatedAt: row.generated_at?.toISOString?.() ?? row.generated_at,
    usedAt: row.used_at?.toISOString?.() ?? row.used_at ?? undefined,
    providerId: row.provider_id ?? undefined,
    providerName: row.provider_name ?? undefined,
    qrData: row.qr_data,
  };
}

export function mapInvoice(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    month: row.month,
    ticketCount: row.ticket_count,
    totalAmount: Number(row.total_amount),
    subsidyAmount: Number(row.subsidy_amount),
    invoiceNumber: row.invoice_number,
    notes: row.notes ?? '',
    fileName: row.file_name ?? '',
    fileData: row.file_data ?? '',
    status: row.status,
    submittedAt: row.submitted_at?.toISOString?.() ?? row.submitted_at,
    reviewedAt: row.reviewed_at?.toISOString?.() ?? row.reviewed_at ?? undefined,
    reviewNote: row.review_note ?? undefined,
  };
}
