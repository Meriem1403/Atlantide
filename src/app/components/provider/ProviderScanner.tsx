import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera, Hash, CheckCircle, XCircle, AlertCircle, StopCircle, X, Loader2,
} from 'lucide-react';

interface ScanResult {
  success: boolean;
  message: string;
}

interface Props {
  onValidate: (number: string) => Promise<ScanResult>;
  todayCount: number;
  todayAmount: number;
}

function parseTicketNumber(raw: string): string {
  const trimmed = raw.trim();
  try {
    const p = JSON.parse(trimmed);
    if (p?.number) return String(p.number);
  } catch { /* plain text */ }
  return trimmed;
}

export function ProviderScanner({ onValidate, todayCount, todayAmount }: Props) {
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>();
  const lastScannedRaw = useRef('');
  const lastValidatedNumber = useRef('');
  const validatingRef = useRef(false);
  const cooldownUntil = useRef(0);
  const SUCCESS_COOLDOWN_MS = 5000;
  const ERROR_COOLDOWN_MS = 2500;

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  const handleValidate = useCallback(async (input: string) => {
    const num = parseTicketNumber(input);
    if (!num || validatingRef.current) return;
    if (Date.now() < cooldownUntil.current) return;
    if (num === lastValidatedNumber.current) return;

    validatingRef.current = true;
    setValidating(true);
    setScanResult(null);
    cooldownUntil.current = Date.now() + SUCCESS_COOLDOWN_MS;

    try {
      const result = await onValidate(num);
      setScanResult(result);
      setFlash(result.success ? 'success' : 'error');
      if (navigator.vibrate) {
        navigator.vibrate(result.success ? [80, 40, 80] : [200]);
      }
      if (result.success) {
        lastValidatedNumber.current = num;
        setManualInput('');
        cooldownUntil.current = Date.now() + SUCCESS_COOLDOWN_MS;
      } else {
        cooldownUntil.current = Date.now() + ERROR_COOLDOWN_MS;
      }
      setTimeout(() => setFlash(null), 900);
    } finally {
      validatingRef.current = false;
      setValidating(false);
    }
  }, [onValidate]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || validatingRef.current || Date.now() < cooldownUntil.current) {
      animRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data && code.data !== lastScannedRaw.current) {
        lastScannedRaw.current = code.data;
        handleValidate(code.data);
      }
    }
    animRef.current = requestAnimationFrame(scanLoop);
  }, [handleValidate]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setCameraStarting(true);
    stopCamera();

    try {
      let stream: MediaStream | null = null;
      const attempts = [
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: true },
      ];
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch { /* try next */ }
      }
      if (!stream) throw new Error('no stream');

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('no video');

      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      setCameraActive(true);
      lastScannedRaw.current = '';
      scanLoop();
    } catch {
      setCameraError('Caméra inaccessible. Autorisez l\'accès dans le navigateur ou utilisez la saisie manuelle.');
      setCameraActive(false);
    } finally {
      setCameraStarting(false);
    }
  }, [scanLoop, stopCamera]);

  useEffect(() => {
    const timer = setTimeout(() => { startCamera(); }, 400);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
    // Caméra : démarrage uniquement au montage de la page scanner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>Scanner un ticket</h1>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4 }}>Cadrez le QR code dans la zone orange</p>
      </div>

      {/* Résultat bien visible */}
      {scanResult && (
        <div
          className="rounded-2xl p-5 flex items-start gap-4 relative"
          style={{
            background: scanResult.success ? '#DCFCE7' : '#FEE2E2',
            border: `2px solid ${scanResult.success ? '#22C55E' : '#EF4444'}`,
            boxShadow: scanResult.success ? '0 8px 30px rgba(34,197,94,0.25)' : '0 8px 30px rgba(239,68,68,0.2)',
          }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: scanResult.success ? '#22C55E' : '#EF4444' }}>
            {scanResult.success
              ? <CheckCircle className="w-8 h-8 text-white" />
              : <XCircle className="w-8 h-8 text-white" />}
          </div>
          <div className="flex-1 pr-8">
            <div style={{ fontSize: 20, fontWeight: 800, color: scanResult.success ? '#15803D' : '#B91C1C' }}>
              {scanResult.success ? 'Ticket validé' : 'Échec de validation'}
            </div>
            <div style={{ fontSize: 15, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>{scanResult.message}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setScanResult(null);
              lastScannedRaw.current = '';
              if (!scanResult.success) lastValidatedNumber.current = '';
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.08)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {validating && (
        <div className="flex items-center justify-center gap-2 py-2" style={{ color: '#FF9500', fontSize: 14, fontWeight: 600 }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Validation en cours…
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl overflow-hidden bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div className="relative bg-black w-full" style={{ aspectRatio: '4/3', minHeight: 280, maxHeight: 420 }}>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Flash succès / erreur */}
            {flash && (
              <div
                className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
                style={{ background: flash === 'success' ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)' }}
              />
            )}

            {!cameraActive && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'rgba(0,0,0,0.85)' }}>
                {cameraStarting ? (
                  <>
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Ouverture de la caméra…</p>
                  </>
                ) : cameraError ? (
                  <>
                    <AlertCircle className="w-12 h-12" style={{ color: '#FF9500' }} />
                    <p className="text-center" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{cameraError}</p>
                    <button type="button" onClick={startCamera} className="px-6 py-3 rounded-2xl" style={{ background: '#FF9500', color: 'white', fontWeight: 600 }}>
                      Réessayer
                    </button>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.5)' }} />
                    <button type="button" onClick={startCamera} className="px-6 py-3 rounded-2xl" style={{ background: '#FF9500', color: 'white', fontWeight: 600 }}>
                      Activer la caméra
                    </button>
                  </>
                )}
              </div>
            )}

            {cameraActive && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                    {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                      <div key={c} className="absolute w-10 h-10" style={{
                        top: c[0] === 't' ? 0 : 'auto', bottom: c[0] === 'b' ? 0 : 'auto',
                        left: c[1] === 'l' ? 0 : 'auto', right: c[1] === 'r' ? 0 : 'auto',
                        borderTop: c[0] === 't' ? '4px solid #FF9500' : 'none',
                        borderBottom: c[0] === 'b' ? '4px solid #FF9500' : 'none',
                        borderLeft: c[1] === 'l' ? '4px solid #FF9500' : 'none',
                        borderRight: c[1] === 'r' ? '4px solid #FF9500' : 'none',
                        borderRadius: 8,
                      }} />
                    ))}
                    <div
                      className="absolute left-3 right-3 h-0.5 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #FF9500, transparent)',
                        animation: 'scanLine 2s ease-in-out infinite',
                        top: '20%',
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 12, fontWeight: 600 }}
                >
                  <StopCircle className="w-4 h-4" /> Arrêter
                </button>
                <div className="absolute bottom-3 left-0 right-0 z-20 text-center px-4">
                  <span className="inline-block px-4 py-2 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 13, fontWeight: 500 }}>
                    Placez le QR code dans le cadre
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-6" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Saisie manuelle</h3>
            <p style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16 }}>Numéro du ticket (ex. TR-…)</p>
            <div className="flex items-center gap-2 px-4 rounded-2xl border-2 border-border mb-3 focus-within:border-primary" style={{ background: '#F5F5F7', height: 52 }}>
              <Hash className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleValidate(manualInput)}
                placeholder="TR-XXXXXXXXXXXXXXXX"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 15, fontFamily: 'monospace' }}
                disabled={validating}
              />
            </div>
            <button
              type="button"
              onClick={() => handleValidate(manualInput)}
              disabled={!manualInput.trim() || validating}
              className="w-full py-3 rounded-2xl disabled:opacity-40"
              style={{ background: '#FF9500', color: 'white', fontSize: 15, fontWeight: 600 }}
            >
              Valider le ticket
            </button>
          </div>

          <div className="rounded-3xl bg-white p-5" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Aujourd&apos;hui</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3 text-center" style={{ background: '#FFF6EB' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#FF9500' }}>{todayCount}</div>
                <div style={{ fontSize: 11, color: '#6E6E73' }}>Scannés</div>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: '#EDFBF1' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#34C759' }}>{todayAmount.toFixed(0)} €</div>
                <div style={{ fontSize: 11, color: '#6E6E73' }}>Montant</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 18%; opacity: 0.5; }
          50% { top: 78%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
