import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle } from 'lucide-react';
import { Ticket } from '../../types';
import { OrgLogo } from './OrgLogo';

interface Props {
  ticket: Ticket;
  orgName: string;
  orgLogo?: string;
  compact?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  used: 'Utilisé',
  expired: 'Expiré',
  cancelled: 'Annulé',
};

export function TicketVisual({ ticket, orgName, orgLogo = '', compact = false }: Props) {
  const isUsed = ticket.status === 'used';
  const monthLabel = new Date(ticket.month + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const qrSize = compact ? 100 : 140;

  return (
    <div className="rounded-3xl overflow-hidden shadow-lg bg-white">
      <div
        className="px-6 pt-6 pb-8 relative overflow-hidden"
        style={{
          background: isUsed
            ? 'linear-gradient(135deg, #64748B, #94A3B8)'
            : 'linear-gradient(135deg, #4361EE 0%, #5B7FFF 60%, #7B9AFF 100%)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <OrgLogo src={orgLogo} size={compact ? 40 : 48} shape="banner" onDark />
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: compact ? 11 : 12, color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
              {orgName}
            </div>
            <div style={{ fontSize: compact ? 9 : 10, color: 'rgba(255,255,255,0.7)' }}>Ticket restaurant</div>
          </div>
          {isUsed && (
            <div className="shrink-0 px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>Utilisé</span>
            </div>
          )}
          {!isUsed && ticket.status !== 'active' && (
            <span className="shrink-0 px-2.5 py-1 rounded-full text-white" style={{ fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.2)' }}>
              {STATUS_LABEL[ticket.status]}
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 4 }}>Valeur du ticket</div>
        <div style={{ fontSize: compact ? 40 : 52, fontWeight: 800, color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>
          {ticket.faceValue.toFixed(2)}<span style={{ fontSize: compact ? 22 : 28, marginLeft: 4 }}>€</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Valable · {monthLabel}</div>

        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      <div className="flex items-center bg-white">
        <div className="w-5 h-5 rounded-full shrink-0 -ml-2.5" style={{ background: '#F0F2F7' }} />
        <div className="flex-1" style={{ borderTop: '2px dashed #E5E7EB' }} />
        <div className="w-5 h-5 rounded-full shrink-0 -mr-2.5" style={{ background: '#F0F2F7' }} />
      </div>

      <div className={`px-6 py-6 ${compact ? '' : 'lg:px-8'}`}>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex flex-col items-center gap-2 shrink-0 mx-auto sm:mx-0">
            <div className="p-3 rounded-2xl border border-border" style={{ background: isUsed ? '#F9FAFB' : 'white' }}>
              <QRCodeSVG value={ticket.qrData} size={qrSize} fgColor={isUsed ? '#9CA3AF' : '#111827'} bgColor="transparent" />
            </div>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>Scanner ce QR code</span>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>N° UNIQUE</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#111827', wordBreak: 'break-all' }}>{ticket.number}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>BÉNÉFICIAIRE</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{ticket.agentName}</div>
            </div>
            <div className="sm:col-span-2">
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>SUBVENTION EMPLOYEUR</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{ticket.subsidy.toFixed(2)} €</div>
            </div>
            {isUsed && ticket.usedAt && (
              <div className="sm:col-span-2 p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
                <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>UTILISÉ LE</div>
                <div style={{ fontSize: 13, color: '#15803D', fontWeight: 500, marginTop: 2 }}>
                  {new Date(ticket.usedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {ticket.providerName ? ` · ${ticket.providerName}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
