import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException, type Result } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanBarcode, CameraOff, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
}

const hints = new Map();
hints.set(DecodeHintType.TRY_HARDER, true);
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
]);

export function BarcodeScanner({ open, onOpenChange, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCodeRef = useRef<{ code: string; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraInfo, setCameraInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setCameraInfo(null);
      return;
    }

    if (!window.isSecureContext) {
      setError("الوصول إلى الكاميرا يتطلب اتصالاً آمناً (HTTPS). افتح التطبيق عبر رابط آمن للمتابعة.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("المتصفح الحالي لا يدعم الوصول إلى الكاميرا.");
      return;
    }

    setError(null);
    setManualCode("");
    const reader = new BrowserMultiFormatReader(hints);
    let cancelled = false;

    const handleResult = (result: Result | undefined, err: unknown) => {
      if (cancelled) return;
      if (result) {
        const code = result.getText();
        const now = Date.now();
        if (lastCodeRef.current && lastCodeRef.current.code === code && now - lastCodeRef.current.time < 2000) {
          return;
        }
        lastCodeRef.current = { code, time: now };
        onDetected(code);
      } else if (err && !(err instanceof NotFoundException)) {
        console.error("Barcode scan error:", err);
      }
    };

    const start = async (constraints: MediaStreamConstraints) => {
      const controls = await reader.decodeFromConstraints(constraints, videoRef.current!, handleResult);
      if (cancelled) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;

      const video = videoRef.current;
      const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        console.log("Camera track:", track.label, track.getSettings());
        setCameraInfo(track.label || "كاميرا غير معروفة");
      }
      video?.play().catch((playErr) => console.warn("video.play() failed:", playErr));
    };

    start({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }).catch((err) => {
      if (cancelled) return;
      console.warn("Falling back to default camera constraints:", err);
      start({ video: true }).catch((fallbackErr) => {
        if (cancelled) return;
        console.error("Camera access failed:", fallbackErr);
        const name = fallbackErr instanceof Error ? fallbackErr.name : "";
        if (name === "NotAllowedError") {
          setError("تم رفض إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح ثم المحاولة مجدداً.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError("لم يتم العثور على كاميرا متاحة على هذا الجهاز.");
        } else {
          setError("تعذر تشغيل الكاميرا. يمكنك إدخال الباركود يدوياً في الأسفل.");
        }
      });
    });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

  const submitManualCode = () => {
    const code = manualCode.trim();
    if (!code) return;
    onDetected(code);
    setManualCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            مسح الباركود
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 p-6 text-center">
              <CameraOff className="h-10 w-10" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" muted autoPlay playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-1/3 w-4/5 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              {cameraInfo && (
                <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/80">
                  {cameraInfo}
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          وجّه الكاميرا نحو باركود الدواء — سيتم إضافته إلى الفاتورة تلقائياً عند القراءة.
        </p>

        <div className="border-t border-border pt-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Keyboard className="h-4 w-4" />
            أو أدخل الباركود يدوياً (يدعم أجهزة قراءة الباركود بالسلك أيضاً)
          </label>
          <div className="flex gap-2">
            <Input
              autoFocus={!!error}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitManualCode();
                }
              }}
              placeholder="اكتب أو امسح الباركود هنا..."
            />
            <Button type="button" onClick={submitManualCode} disabled={!manualCode.trim()}>
              إضافة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
