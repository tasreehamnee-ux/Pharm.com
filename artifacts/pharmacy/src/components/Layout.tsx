import { Link, useLocation } from "wouter";
import { Pill, Activity, Receipt, ShoppingCart, Users, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

const NAV_ITEMS = [
  { href: "/", label: "لوحة القيادة", icon: Activity },
  { href: "/pos", label: "نقطة البيع (POS)", icon: ShoppingCart },
  { href: "/medicines", label: "الأدوية والمخزون", icon: Pill },
  { href: "/sales", label: "المبيعات", icon: Receipt },
  { href: "/purchases", label: "المشتريات", icon: Truck },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/suppliers", label: "الموردين", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden rtl" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-l border-border bg-card flex flex-col h-full z-10 shadow-sm">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-lg">
            <Pill className="h-6 w-6" />
          </div>
          <div className="font-bold text-xl tracking-tight text-primary">صيدليتي</div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">القائمة الرئيسية</div>
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors", 
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border">
              ص
            </div>
            <div>
              <p className="text-sm font-medium">صيدلي مناوب</p>
              <p className="text-xs text-muted-foreground">مدير النظام</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-muted/30">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-8 flex-shrink-0 sticky top-0 z-10">
          <h2 className="text-lg font-semibold tracking-tight">
            {NAV_ITEMS.find(item => item.href === location)?.label || "نظام الصيدلية الذكي"}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
