import React, { useState } from "react";
import { 
  useListMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine, 
  getListMedicinesQueryKey 
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const medicineSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  manufacturer: z.string().min(1, "الشركة المصنعة مطلوبة"),
  barcode: z.string().min(1, "الباركود مطلوب"),
  unit: z.string().min(1, "الوحدة مطلوبة"),
  quantity: z.coerce.number().min(0, "يجب أن تكون الكمية 0 أو أكثر"),
  minQuantity: z.coerce.number().min(0, "يجب أن يكون الحد الأدنى 0 أو أكثر"),
  purchasePrice: z.coerce.number().min(0, "يجب أن يكون سعر الشراء 0 أو أكثر"),
  sellingPrice: z.coerce.number().min(0, "يجب أن يكون سعر البيع 0 أو أكثر"),
  expiryDate: z.string().min(1, "تاريخ الانتهاء مطلوب"),
  batchNumber: z.string().min(1, "رقم التشغيلة مطلوب"),
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

export default function Medicines() {
  const [search, setSearch] = useState("");
  const { data: medicines, isLoading } = useListMedicines({ search: search || undefined });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: { 
      name: "", category: "", manufacturer: "", barcode: "", unit: "علبة", 
      quantity: 0, minQuantity: 5, purchasePrice: 0, sellingPrice: 0, 
      expiryDate: new Date().toISOString().split("T")[0], batchNumber: "" 
    },
  });

  const handleOpenAdd = () => {
    form.reset({
      name: "", category: "", manufacturer: "", barcode: "", unit: "علبة", 
      quantity: 0, minQuantity: 5, purchasePrice: 0, sellingPrice: 0, 
      expiryDate: new Date().toISOString().split("T")[0], batchNumber: "" 
    });
    setEditingId(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (med: any) => {
    form.reset({
      name: med.name, category: med.category, manufacturer: med.manufacturer, 
      barcode: med.barcode, unit: med.unit, quantity: med.quantity, 
      minQuantity: med.minQuantity, purchasePrice: med.purchasePrice, 
      sellingPrice: med.sellingPrice, expiryDate: med.expiryDate.split("T")[0], 
      batchNumber: med.batchNumber
    });
    setEditingId(med.id);
    setIsAddOpen(true);
  };

  const onSubmit = (values: MedicineFormValues) => {
    // format date properly
    const formattedValues = {
      ...values,
      expiryDate: new Date(values.expiryDate).toISOString()
    };

    if (editingId) {
      updateMedicine.mutate({ id: editingId, data: formattedValues }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          toast({ title: "تم التحديث", description: "تم تحديث الدواء بنجاح." });
          setIsAddOpen(false);
        }
      });
    } else {
      createMedicine.mutate({ data: formattedValues }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          toast({ title: "تمت الإضافة", description: "تمت إضافة الدواء بنجاح." });
          setIsAddOpen(false);
        }
      });
    }
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMedicine.mutate({ id: deletingId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          toast({ title: "تم الحذف", description: "تم حذف الدواء بنجاح." });
          setDeletingId(null);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">الأدوية والمخزون</h1>
          <p className="text-muted-foreground">إدارة جميع الأدوية والمخزون الحالي</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="ml-2 h-4 w-4" /> إضافة دواء
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2 space-x-reverse relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث عن دواء..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">الباركود</TableHead>
                <TableHead className="text-right">سعر البيع</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                <TableHead className="text-right w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : medicines?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لم يتم العثور على أدوية</TableCell>
                </TableRow>
              ) : (
                medicines?.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-bold">{med.name}</TableCell>
                    <TableCell className="text-muted-foreground">{med.category}</TableCell>
                    <TableCell className="font-mono text-sm">{med.barcode}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(med.sellingPrice)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${med.quantity <= med.minQuantity ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                        {med.quantity} {med.unit}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(med.expiryDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenEdit(med)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingId(med.id)}>
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
      
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل بيانات دواء" : "إضافة دواء جديد"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الباركود</FormLabel>
                    <FormControl><Input {...field} dir="ltr" className="text-right font-mono" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>التصنيف</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="manufacturer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشركة المصنعة</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر الشراء</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} dir="ltr" className="text-right" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر البيع</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} dir="ltr" className="text-right" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية الحالية</FormLabel>
                    <FormControl><Input type="number" {...field} dir="ltr" className="text-right" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="minQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحد الأدنى للتنبيه</FormLabel>
                    <FormControl><Input type="number" {...field} dir="ltr" className="text-right" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوحدة</FormLabel>
                    <FormControl><Input {...field} placeholder="علبة، شريط، الخ" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="batchNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم التشغيلة (Batch)</FormLabel>
                    <FormControl><Input {...field} dir="ltr" className="text-right" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>تاريخ الانتهاء</FormLabel>
                    <FormControl><Input type="date" {...field} dir="ltr" className="text-right" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createMedicine.isPending || updateMedicine.isPending}>
                  {editingId ? "حفظ التعديلات" : "إضافة"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p>هل أنت متأكد من رغبتك في حذف هذا الدواء؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMedicine.isPending}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
