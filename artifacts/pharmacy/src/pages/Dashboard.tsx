import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, AlertTriangle, Clock, Receipt, Banknote, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-8">جاري التحميل...</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title="إجمالي الأدوية" value={stats.totalMedicines} icon={Pill} color="text-blue-500" bgColor="bg-blue-50" />
        <MetricCard title="مخزون منخفض" value={stats.lowStockCount} icon={AlertTriangle} color="text-amber-500" bgColor="bg-amber-50" />
        <MetricCard title="تنتهي قريباً" value={stats.expiringSoonCount} icon={Clock} color="text-red-500" bgColor="bg-red-50" />
        <MetricCard title="مبيعات اليوم" value={stats.todaySalesCount} icon={Receipt} color="text-green-500" bgColor="bg-green-50" />
        <MetricCard title="إيرادات اليوم" value={formatCurrency(stats.todaySalesTotal)} icon={Banknote} color="text-emerald-500" bgColor="bg-emerald-50" />
        <MetricCard title="العملاء" value={stats.totalCustomers} icon={Users} color="text-indigo-500" bgColor="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>أحدث المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentSales?.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">طلب {sale.id}</p>
                    <p className="text-sm text-muted-foreground">{new Date(sale.createdAt).toLocaleString('ar-SA')}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-muted-foreground">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))}
              {!stats.recentSales?.length && (
                <p className="text-muted-foreground text-center py-4">لا توجد مبيعات حديثة</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bgColor }: { title: string, value: string | number, icon: any, color: string, bgColor: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
        <div className={`p-3 rounded-full ${bgColor} ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
      </CardContent>
    </Card>
  );
}
