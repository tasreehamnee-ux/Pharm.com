import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScanBarcode, CameraOff } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCodeRef = useRef<{ code: string; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    setError(null);
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result, err) => {
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
            // Ignore per-frame "not found" noise; surface other errors only.
          }
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? "تعذر الوصول إلى الكاميرا. تأكد من منح الإذن للكاميرا."
            : "حدث خطأ غير متوقع في الكاميرا.",
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

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
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-1/3 w-4/5 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          وجّه الكاميرا نحو باركود الدواء — سيتم إضافته إلى الفاتورة تلقائياً عند القراءة.
        </p>
      </DialogContent>
    </Dialog>
  );
}
