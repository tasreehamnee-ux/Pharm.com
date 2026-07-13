import React, { useState } from "react";
import { 
  useListPurchases, useCreatePurchase, useListSuppliers, useListMedicines,
  getListPurchasesQueryKey, getListMedicinesQueryKey 
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Medicine } from "@workspace/api-client-react";

export default function Purchases() {
  const { data: purchases, isLoading } = useListPurchases();
  const { data: suppliers } = useListSuppliers();
  const { data: medicines } = useListMedicines();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<any | null>(null);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [cart, setCart] = useState<{med: Medicine, qty: number, unitCost: number}[]>([]);
  const [medSearch, setMedSearch] = useState("");
  
  const createPurchase = useCreatePurchase();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenAdd = () => {
    setSelectedSupplierId("");
    setCart([]);
    setMedSearch("");
    setIsAddOpen(true);
  };

  const addToCart = (med: Medicine) => {
    if (!cart.find(item => item.med.id === med.id)) {
      setCart([...cart, { med, qty: 1, unitCost: med.purchasePrice }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.med.id !== id));
  };

  const updateCartItem = (id: number, field: 'qty' | 'unitCost', value: number) => {
    if (value < 0) value = 0;
    setCart(cart.map(item => item.med.id === id ? { ...item, [field]: value } : item));
  };

  const filteredMeds = medicines?.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase())) || [];
  const cartTotal = cart.reduce((acc, item) => acc + (item.qty * item.unitCost), 0);

  const handleSubmit = () => {
    if (!selectedSupplierId) {
      toast({ title: "خطأ", description: "يرجى اختيار المورد", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة صنف واحد على الأقل", variant: "destructive" });
      return;
    }

    createPurchase.mutate({
      data: {
        supplierId: parseInt(selectedSupplierId),
        items: cart.map(c => ({
          medicineId: c.med.id,
          quantity: c.qty,
          unitCost: c.unitCost
        }))
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
        toast({ title: "تم النجاح", description: "تم تسجيل أمر الشراء بنجاح وتحديث المخزون." });
        setIsAddOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">المشتريات</h1>
          <p className="text-muted-foreground">أوامر الشراء وإدارة الواردات من الموردين</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="ml-2 h-4 w-4" /> طلب شراء جديد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <CardTitle className="text-lg">سجل أوامر الشراء</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المورد</TableHead>
                <TableHead className="text-right">عدد الأصناف</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : purchases?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد أوامر شراء مسجلة</TableCell>
                </TableRow>
              ) : (
                purchases?.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-sm font-medium">PO-{purchase.id.toString().padStart(5, '0')}</TableCell>
                    <TableCell>{new Date(purchase.createdAt).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="font-bold">{purchase.supplierName}</TableCell>
                    <TableCell>{purchase.items.length} أصناف</TableCell>
                    <TableCell className="font-bold text-primary">{formatCurrency(purchase.total)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => setViewingPurchase(purchase)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Purchase Dialog */}
      <Dialog open={!!viewingPurchase} onOpenChange={(open) => !open && setViewingPurchase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>أمر شراء PO-{viewingPurchase?.id?.toString().padStart(5, '0')}</DialogTitle>
          </DialogHeader>
          {viewingPurchase && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الطلب</p>
                  <p className="font-bold">{new Date(viewingPurchase.createdAt).toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المورد</p>
                  <p className="font-bold">{viewingPurchase.supplierName}</p>
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
                    {viewingPurchase.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border border-border">
                <span className="font-bold text-lg">الإجمالي</span>
                <span className="font-bold text-2xl text-primary">{formatCurrency(viewingPurchase.total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingPurchase(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Purchase Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>تسجيل أمر شراء جديد</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-6 py-4 flex-1 overflow-hidden">
            {/* Left: Search & Select */}
            <div className="col-span-1 border-l border-border pl-6 flex flex-col space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المورد</label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                <label className="text-sm font-medium">البحث عن أدوية</label>
                <div className="relative">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="ابحث..." 
                    value={medSearch}
                    onChange={(e) => setMedSearch(e.target.value)}
                    className="pr-8"
                  />
                </div>
                <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
                  {filteredMeds.map(med => (
                    <div 
                      key={med.id} 
                      className="p-2 border rounded-md cursor-pointer hover:bg-muted/50 flex justify-between items-center"
                      onClick={() => addToCart(med)}
                    >
                      <span className="font-medium text-sm">{med.name}</span>
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Cart */}
            <div className="col-span-2 flex flex-col overflow-hidden pr-2">
              <div className="flex-1 overflow-y-auto rounded-md border border-border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                    <TableRow>
                      <TableHead className="text-right">الدواء</TableHead>
                      <TableHead className="text-right w-24">سعر التكلفة</TableHead>
                      <TableHead className="text-right w-24">الكمية</TableHead>
                      <TableHead className="text-right w-20">الإجمالي</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">أضف أدوية من القائمة الجانبية</TableCell>
                      </TableRow>
                    ) : (
                      cart.map(item => (
                        <TableRow key={item.med.id}>
                          <TableCell className="font-medium">{item.med.name}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.unitCost} 
                              onChange={(e) => updateCartItem(item.med.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                              dir="ltr"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.qty} 
                              onChange={(e) => updateCartItem(item.med.id, 'qty', parseInt(e.target.value) || 0)}
                              className="h-8 text-right"
                              dir="ltr"
                            />
                          </TableCell>
                          <TableCell className="font-bold">{formatCurrency(item.qty * item.unitCost)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.med.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between bg-muted/20 p-4 rounded-lg border border-border">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الفاتورة</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                  <Button onClick={handleSubmit} disabled={createPurchase.isPending}>
                    تأكيد أمر الشراء
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
