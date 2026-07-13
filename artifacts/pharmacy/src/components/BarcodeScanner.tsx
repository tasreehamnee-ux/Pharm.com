import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
  type Result,
} from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanBarcode, CameraOff, Keyboard, RefreshCw, Camera } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
}

const HINTS = new Map();
HINTS.set(DecodeHintType.TRY_HARDER, true);
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
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

type CameraState = "idle" | "requesting" | "active" | "error";

export function BarcodeScanner({ open, onOpenChange, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCodeRef = useRef<{ code: string; time: number } | null>(null);

  const [state, setState] = useState<CameraState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraLabel, setCameraLabel] = useState("");
  const [manualCode, setManualCode] = useState("");

  const stopAll = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopAll();
    setState("requesting");
    setErrorMsg("");
    setCameraLabel("");

    // Step 1: request camera permission explicitly
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (e1) {
      // retry with minimal constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (e2) {
        const err = e2 as DOMException;
        if (err.name === "NotAllowedError") {
          setErrorMsg("تم رفض إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا من شريط العنوان في المتصفح ثم أعد المحاولة.");
        } else if (err.name === "NotFoundError") {
          setErrorMsg("لم يتم العثور على كاميرا على هذا الجهاز.");
        } else {
          setErrorMsg(`تعذّر تشغيل الكاميرا (${err.name}). يمكنك إدخال الباركود يدوياً أدناه.`);
        }
        setState("error");
        return;
      }
    }

    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    if (track) setCameraLabel(track.label || "كاميرا");

    // Step 2: attach stream to video element
    const video = videoRef.current;
    if (!video) { stopAll(); return; }
    video.srcObject = stream;
    try { await video.play(); } catch (_) { /* autoplay policy — playsInline handles it */ }

    // Step 3: start ZXing decoding from the live video element
    readerRef.current = new BrowserMultiFormatReader(HINTS);
    try {
      const controls = await readerRef.current.decodeFromVideoElement(
        video,
        (result: Result | undefined, err: unknown) => {
          if (result) {
            const code = result.getText();
            const now = Date.now();
            if (
              lastCodeRef.current &&
              lastCodeRef.current.code === code &&
              now - lastCodeRef.current.time < 2000
            ) return;
            lastCodeRef.current = { code, time: now };
            onDetected(code);
          } else if (err && !(err instanceof NotFoundException)) {
            // non-fatal scanning error — ignore
          }
        }
      );
      controlsRef.current = controls;
      setState("active");
    } catch (decodeErr) {
      console.error("ZXing decode error:", decodeErr);
      // Camera is working (video is playing), just ZXing failed to attach
      // Still show video and let user try again
      setState("active");
    }
  }, [onDetected, stopAll]);

  // Start when dialog opens
  useEffect(() => {
    if (!open) {
      stopAll();
      setState("idle");
      setErrorMsg("");
      setManualCode("");
      return;
    }

    if (!window.isSecureContext) {
      setErrorMsg("الوصول إلى الكاميرا يتطلب HTTPS. افتح التطبيق عبر رابط آمن.");
      setState("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("المتصفح الحالي لا يدعم الوصول إلى الكاميرا.");
      setState("error");
      return;
    }

    startCamera();
    return () => stopAll();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Camera viewport */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          {/* Always render video — hidden when error */}
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${state === "error" ? "hidden" : ""}`}
            muted
            autoPlay
            playsInline
          />

          {state === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/80">
              <Camera className="h-10 w-10 animate-pulse" />
              <p className="text-sm font-medium">جاري تشغيل الكاميرا...</p>
              <p className="text-xs text-white/60 text-center px-4">
                سيظهر طلب إذن الكاميرا — يرجى السماح بالوصول
              </p>
            </div>
          )}

          {state === "active" && (
            <>
              {/* Scanning reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-2/5 w-4/5">
                  <div className="absolute inset-0 rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  {/* corner marks */}
                  <span className="absolute top-0 right-0 h-5 w-5 border-t-4 border-r-4 border-primary rounded-tr-md" />
                  <span className="absolute top-0 left-0 h-5 w-5 border-t-4 border-l-4 border-primary rounded-tl-md" />
                  <span className="absolute bottom-0 right-0 h-5 w-5 border-b-4 border-r-4 border-primary rounded-br-md" />
                  <span className="absolute bottom-0 left-0 h-5 w-5 border-b-4 border-l-4 border-primary rounded-bl-md" />
                  {/* scanning line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/80 animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              </div>
              {cameraLabel && (
                <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/80">
                  {cameraLabel}
                </div>
              )}
            </>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-6 text-center bg-black">
              <CameraOff className="h-12 w-12 text-red-400" />
              <p className="text-sm leading-relaxed">{errorMsg}</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-white border-white/30 hover:bg-white/10"
                onClick={startCamera}
              >
                <RefreshCw className="h-4 w-4" /> إعادة المحاولة
              </Button>
            </div>
          )}
        </div>

        {state === "active" && (
          <p className="text-sm text-muted-foreground text-center -mt-1">
            وجّه الكاميرا نحو الباركود — سيُضاف الدواء تلقائياً عند القراءة
          </p>
        )}

        {/* Manual entry */}
        <div className="border-t border-border pt-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Keyboard className="h-4 w-4" />
            أو أدخل الباركود يدوياً (يدعم أجهزة القراءة بالسلك)
          </label>
          <div className="flex gap-2">
            <Input
              autoFocus={state === "error"}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submitManualCode(); }
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
