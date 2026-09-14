import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InvoiceItem {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface InvoiceData {
  id: number;
  createdAt: string;
  customerName?: string | null;
  paymentMethod: string;
  total: number;
  paidAmount?: number;
  changeAmount?: number;
  items: InvoiceItem[];
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  sale: InvoiceData | null;
  pharmacyName?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  footerNote?: string;
}

const paymentLabel = (m: string) =>
  m === "cash" ? "نقدي" : m === "card" ? "بطاقة" : "تأمين";

export function InvoiceModal({
  open,
  onClose,
  sale,
  pharmacyName = "الصيدلية",
  pharmacyPhone = "",
  pharmacyAddress = "",
  footerNote = "",
}: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة INV-${sale?.id?.toString().padStart(5, "0")}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 4mm 3mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; background: #fff; color: #111; font-size: 13px; width: 80mm; }
  .page { width: 100%; padding: 4px 2px; }
  .header { text-align: center; border-bottom: 2px dashed #555; padding-bottom: 8px; margin-bottom: 8px; }
  .header h1 { font-size: 18px; font-weight: 900; margin-bottom: 3px; }
  .header p { font-size: 11px; color: #444; line-height: 1.5; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; }
  .meta div { display: flex; flex-direction: column; gap: 2px; }
  .meta span.label { color: #666; font-size: 10px; }
  .meta span.value { font-weight: 700; font-size: 11px; }
  .divider { border-top: 1px dashed #999; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th { font-size: 11px; padding: 4px 3px; text-align: right; border-bottom: 1px solid #333; }
  td { padding: 4px 3px; font-size: 11px; border-bottom: 1px dotted #ddd; }
  .total-row { border-top: 2px solid #333; margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; }
  .total-row .label { font-size: 15px; font-weight: 700; }
  .total-row .amount { font-size: 17px; font-weight: 900; }
  .pay-row { display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; }
  .footer { text-align: center; border-top: 1px dashed #999; padding-top: 7px; margin-top: 7px; font-size: 11px; color: #555; line-height: 1.6; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${pharmacyName}</h1>
    ${pharmacyPhone ? `<p>هاتف: ${pharmacyPhone}</p>` : ""}
    ${pharmacyAddress ? `<p>${pharmacyAddress}</p>` : ""}
  </div>
  <div class="meta">
    <div>
      <span class="label">رقم الفاتورة</span>
      <span class="value">INV-${sale?.id?.toString().padStart(5, "0")}</span>
    </div>
    <div>
      <span class="label">التاريخ</span>
      <span class="value">${sale ? new Date(sale.createdAt).toLocaleString("ar-IQ") : ""}</span>
    </div>
  </div>
  <div class="meta">
    <div>
      <span class="label">طريقة الدفع</span>
      <span class="value">${paymentLabel(sale?.paymentMethod || "")}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>الصنف</th>
        <th>الكمية</th>
        <th>السعر</th>
        <th>المجموع</th>
      </tr>
    </thead>
    <tbody>
      ${sale?.items
        .map(
          (item) => `
        <tr>
          <td>${item.medicineName}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.subtotal)}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>
  <div class="total-row">
    <span class="label">الإجمالي</span>
    <span class="amount">${formatCurrency(sale?.total || 0)}</span>
  </div>
  ${
    sale?.paidAmount && sale.paidAmount > 0
      ? `<div class="pay-row"><span>المبلغ المدفوع:</span><strong>${formatCurrency(sale.paidAmount)}</strong></div>
         <div class="pay-row"><span>الباقي للعميل:</span><strong>${formatCurrency(sale.changeAmount || 0)}</strong></div>`
      : ""
  }
  ${footerNote ? `<div class="footer"><p>${footerNote}</p></div>` : ""}
  <div class="footer"><p>شكراً لزيارتكم 💊</p></div>

</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div ref={printRef}>
          <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{pharmacyName}</h2>
              {pharmacyPhone && <p className="text-sm opacity-80">هاتف: {pharmacyPhone}</p>}
              {pharmacyAddress && <p className="text-sm opacity-80">{pharmacyAddress}</p>}
            </div>
            <div className="text-left text-sm opacity-90">
              <p className="font-bold text-lg">INV-{sale.id.toString().padStart(5, "0")}</p>
              <p>{new Date(sale.createdAt).toLocaleString("ar-IQ")}</p>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-border bg-muted/20 flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">طريقة الدفع: </span>
              <span className="font-bold">{paymentLabel(sale.paymentMethod)}</span>
            </div>
          </div>

          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground">
                  <th className="text-right py-2 px-2 rounded-r-md">الصنف</th>
                  <th className="text-right py-2 px-2">الكمية</th>
                  <th className="text-right py-2 px-2">السعر</th>
                  <th className="text-right py-2 px-2 rounded-l-md">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sale.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 px-2 font-medium">{item.medicineName}</td>
                    <td className="py-2 px-2">{item.quantity}</td>
                    <td className="py-2 px-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 px-2 font-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mx-6 mb-2 bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
            <span className="text-lg font-bold">الإجمالي</span>
            <span className="text-2xl font-black text-primary">{formatCurrency(sale.total)}</span>
          </div>

          {sale.paidAmount && sale.paidAmount > 0 ? (
            <div className="mx-6 mb-4 bg-muted/40 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ المدفوع:</span>
                <span className="font-bold">{formatCurrency(sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>الباقي للعميل:</span>
                <span className="text-base">{formatCurrency(sale.changeAmount || 0)}</span>
              </div>
            </div>
          ) : null}

          {footerNote && (
            <p className="text-center text-sm text-muted-foreground pb-3 px-6">{footerNote}</p>
          )}
          <p className="text-center text-sm text-muted-foreground pb-4">شكراً لزيارتكم 💊</p>

        </div>

        <div className="border-t border-border px-6 py-4 flex gap-3 justify-end bg-muted/10">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 ml-2" /> إغلاق
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 ml-2" /> طباعة الفاتورة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
