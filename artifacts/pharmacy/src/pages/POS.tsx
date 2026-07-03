import React, { useCallback, useState } from "react";
import { 
  useListMedicines, useCreateSale, useListCustomers, 
  getListSalesQueryKey, getListMedicinesQueryKey, getGetDashboardStatsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, ShieldPlus, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Medicine } from "@workspace/api-client-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { listMedicines } from "@workspace/api-client-react";

export default function POS() {
  const [search, setSearch] = useState("");
  const { data: medicines } = useListMedicines({ search: search || undefined });
  const { data: customers } = useListCustomers();
  
  const [cart, setCart] = useState<{med: Medicine, qty: number}[]>([]);
  const [customerId, setCustomerId] = useState<string>("cash");
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'insurance'>('cash');
  const [scannerOpen, setScannerOpen] = useState(false);
  
  const createSale = useCreateSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addToCart = (med: Medicine) => {
    if (med.quantity <= 0) {
      toast({ title: "المخزون فارغ", description: "لا يوجد كمية متاحة من هذا الدواء.", variant: "destructive" });
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.med.id === med.id);
      if (existing) {
        if (existing.qty >= med.quantity) {
          toast({ title: "تجاوز المخزون", description: "تم الوصول للحد الأقصى المتاح من الدواء.", variant: "destructive" });
          return prev;
        }
        return prev.map(item => item.med.id === med.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { med, qty: 1 }];
    });
  };

  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    try {
      const results = await listMedicines({ search: barcode });
      const match = results.find(m => m.barcode === barcode);
      if (!match) {
        toast({ title: "لم يتم العثور على الدواء", description: `لا يوجد دواء بالباركود ${barcode}`, variant: "destructive" });
        return;
      }
      addToCart(match);
      toast({ title: "تمت الإضافة", description: `${match.name} أُضيف إلى الفاتورة.` });
    } catch {
      toast({ title: "خطأ", description: "تعذر البحث عن الدواء بالباركود.", variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.med.id !== id));
  };

  const updateQty = (med: Medicine, qty: number) => {
    if (qty <= 0) {
      removeFromCart(med.id);
      return;
    }
    if (qty > med.quantity) {
      toast({ title: "تجاوز المخزون", description: "تم الوصول للحد الأقصى المتاح من الدواء.", variant: "destructive" });
      qty = med.quantity;
    }
    setCart(prev => prev.map(item => item.med.id === med.id ? { ...item, qty } : item));
  };

  const total = cart.reduce((acc, item) => acc + (item.med.sellingPrice * item.qty), 0);

  const handleCheckout = () => {
    createSale.mutate({
      data: {
        paymentMethod: paymentMethod,
        customerId: customerId !== "cash" ? parseInt(customerId) : undefined,
        items: cart.map(c => ({
          medicineId: c.med.id,
          quantity: c.qty
        }))
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم الدفع بنجاح", description: "تم تسجيل عملية البيع بنجاح وتحديث المخزون." });
        setCart([]);
        setCustomerId("cash");
        setSearch("");
        queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      }
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Left pane: Products */}
      <div className="flex-1 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="البحث بالاسم أو الباركود..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 h-12 text-lg shadow-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 px-4 shadow-sm"
                onClick={() => setScannerOpen(true)}
              >
                <ScanBarcode className="h-5 w-5" />
                مسح بالكاميرا
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {medicines?.map(med => {
                const cartItem = cart.find(c => c.med.id === med.id);
                const isOutOfStock = med.quantity <= 0;
                return (
                  <div 
                    key={med.id} 
                    className={`border rounded-xl p-4 transition-all flex flex-col select-none relative overflow-hidden ${
                      isOutOfStock 
                        ? 'opacity-50 grayscale cursor-not-allowed border-muted bg-muted/20' 
                        : 'border-border bg-card hover:border-primary hover:shadow-md cursor-pointer group active:scale-[0.98]'
                    }`}
                    onClick={() => !isOutOfStock && addToCart(med)}
                  >
                    {cartItem && (
                      <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-br-lg">
                        {cartItem.qty}x
                      </div>
                    )}
                    <p className="font-bold text-base truncate pr-1">{med.name}</p>
                    <p className="text-xs text-muted-foreground truncate mb-4">{med.category}</p>
                    <div className="mt-auto flex justify-between items-end">
                      <span className="font-bold text-lg text-primary">${med.sellingPrice.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-1 rounded-md font-bold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {med.quantity} {med.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
              {!medicines?.length && search && (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>لا توجد نتائج للبحث</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right pane: Cart */}
      <Card className="w-[400px] flex flex-col flex-shrink-0 border-border shadow-md">
        <CardHeader className="border-b border-border py-4 bg-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" /> الفاتورة الحالية
          </CardTitle>
        </CardHeader>
        
        {/* Customer Select */}
        <div className="p-3 border-b border-border bg-muted/20">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="عميل نقدي" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">عميل نقدي (بدون تسجيل)</SelectItem>
              {customers?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-0 bg-card">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 opacity-60">
              <ShoppingCart className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">الفاتورة فارغة</p>
              <p className="text-sm">أضف بعض الأدوية للبدء</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map(item => (
                <div key={item.med.id} className="p-4 flex flex-col gap-3 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-base leading-none mb-1">{item.med.name}</p>
                      <p className="text-sm text-muted-foreground">${item.med.sellingPrice.toFixed(2)} / وحدة</p>
                    </div>
                    <p className="font-bold text-lg">${(item.med.sellingPrice * item.qty).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-muted" onClick={() => updateQty(item.med, item.qty - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center text-base font-bold select-none">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-muted" onClick={() => updateQty(item.med, item.qty + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.med.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-border flex-col gap-4 p-5 bg-card shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-muted-foreground text-sm">
              <span>المجموع الفرعي</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-sm">
              <span>الضريبة (0%)</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-bold text-2xl pt-3 border-t border-border mt-3">
              <span>الإجمالي</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="w-full grid grid-cols-3 gap-3">
            <Button 
              variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
              className="flex-col h-16 gap-1" 
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs">نقدي</span>
            </Button>
            <Button 
              variant={paymentMethod === 'card' ? 'default' : 'outline'} 
              className="flex-col h-16 gap-1"
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">بطاقة</span>
            </Button>
            <Button 
              variant={paymentMethod === 'insurance' ? 'default' : 'outline'} 
              className="flex-col h-16 gap-1"
              onClick={() => setPaymentMethod('insurance')}
            >
              <ShieldPlus className="h-5 w-5" />
              <span className="text-xs">تأمين</span>
            </Button>
          </div>

          <Button 
            className="w-full h-14 text-lg shadow-md hover:shadow-lg transition-all" 
            disabled={cart.length === 0 || createSale.isPending} 
            onClick={handleCheckout}
          >
            {createSale.isPending ? "جاري المعالجة..." : `دفع (${total.toFixed(2)}$)`}
          </Button>
        </CardFooter>
      </Card>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
}
