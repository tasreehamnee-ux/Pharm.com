import React, { useState } from "react";
import { 
  useListSales, useDeleteSale, getListSalesQueryKey, getGetDashboardStatsQueryKey 
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Sales() {
  const { data: sales, isLoading } = useListSales();
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const deleteSale = useDeleteSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const confirmDelete = () => {
    if (deletingId) {
      deleteSale.mutate({ id: deletingId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "تم الإلغاء", description: "تم إلغاء الفاتورة واسترجاع الكميات بنجاح." });
          setDeletingId(null);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المبيعات</h1>
        <p className="text-muted-foreground">سجل المبيعات والفواتير السابقة</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <CardTitle className="text-lg">سجل الفواتير</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">طريقة الدفع</TableHead>
                <TableHead className="text-right">عناصر</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : sales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد مبيعات مسجلة</TableCell>
                </TableRow>
              ) : (
                sales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm font-medium">INV-{sale.id.toString().padStart(5, '0')}</TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="font-medium">{sale.customerName || 'عميل نقدي'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-secondary text-secondary-foreground border border-secondary-border">
                        {sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'تأمين'}
                      </span>
                    </TableCell>
                    <TableCell>{sale.items.length} أصناف</TableCell>
                    <TableCell className="font-bold text-primary">{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => setViewingSale(sale)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingId(sale.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة INV-{viewingSale?.id?.toString().padStart(5, '0')}</DialogTitle>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الفاتورة</p>
                  <p className="font-bold">{new Date(viewingSale.createdAt).toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">العميل</p>
                  <p className="font-bold">{viewingSale.customerName || 'عميل نقدي'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                  <p className="font-bold">{viewingSale.paymentMethod === 'cash' ? 'نقدي' : viewingSale.paymentMethod === 'card' ? 'بطاقة' : 'تأمين'}</p>
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">الدواء</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">المجموع الفرعي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingSale.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border border-border">
                <span className="font-bold text-lg">الإجمالي</span>
                <span className="font-bold text-2xl text-primary">{formatCurrency(viewingSale.total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingSale(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد إلغاء الفاتورة</DialogTitle>
          </DialogHeader>
          <p className="text-destructive font-medium mt-2 mb-4">
            هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم استرجاع كميات الأدوية إلى المخزون.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>تراجع</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteSale.isPending}>إلغاء الفاتورة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
