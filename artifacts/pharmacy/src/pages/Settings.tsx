import React, { useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Building2, Phone, MapPin, FileText, Save } from "lucide-react";

const settingsSchema = z.object({
  pharmacyName: z.string().min(1, "اسم الصيدلية مطلوب"),
  phone: z.string().default(""),
  address: z.string().default(""),
  taxNumber: z.string().default(""),
  footerNote: z.string().default(""),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      pharmacyName: "",
      phone: "",
      address: "",
      taxNumber: "",
      footerNote: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        pharmacyName: settings.pharmacyName,
        phone: settings.phone,
        address: settings.address,
        taxNumber: settings.taxNumber,
        footerNote: settings.footerNote,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsForm) => {
    updateSettings.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({
            title: "تم الحفظ",
            description: "تم حفظ معلومات الصيدلية بنجاح.",
          });
        },
        onError: () => {
          toast({
            title: "خطأ",
            description: "تعذّر حفظ الإعدادات، يرجى المحاولة مرة أخرى.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الصيدلية</h1>
        <p className="text-muted-foreground">
          هذه المعلومات تظهر تلقائياً في رأس الفاتورة عند الطباعة
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-border bg-muted/20 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            معلومات الصيدلية
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="pharmacyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      اسم الصيدلية *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: صيدلية الشفاء" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      رقم الهاتف
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: 07901234567"
                        {...field}
                        className="h-11"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      العنوان
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: بغداد، شارع الرشيد"
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم الضريبي</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="اختياري"
                        {...field}
                        className="h-11"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="footerNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      ملاحظة أسفل الفاتورة
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="مثال: شكراً لزيارتكم — لا يُقبل الإرجاع بعد 24 ساعة"
                        {...field}
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-base gap-2"
                  disabled={updateSettings.isPending}
                >
                  <Save className="h-5 w-5" />
                  {updateSettings.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            معاينة رأس الفاتورة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 text-center space-y-1">
            <p className="text-xl font-black">
              {form.watch("pharmacyName") || "اسم الصيدلية"}
            </p>
            {form.watch("phone") && (
              <p className="text-sm text-muted-foreground">
                هاتف: {form.watch("phone")}
              </p>
            )}
            {form.watch("address") && (
              <p className="text-sm text-muted-foreground">{form.watch("address")}</p>
            )}
            {form.watch("taxNumber") && (
              <p className="text-sm text-muted-foreground">
                الرقم الضريبي: {form.watch("taxNumber")}
              </p>
            )}
            <div className="border-t border-dashed border-primary/30 mt-3 pt-3 text-xs text-muted-foreground">
              ... بنود الفاتورة ...
            </div>
            {form.watch("footerNote") && (
              <p className="text-xs text-muted-foreground pt-1">
                {form.watch("footerNote")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
