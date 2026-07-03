import { Router, type IRouter } from "express";
import { eq, desc, lte, sql, count, sum, inArray } from "drizzle-orm";
import { db, medicinesTable, customersTable, salesTable, saleItemsTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [{ totalMedicines }] = await db
    .select({ totalMedicines: count() })
    .from(medicinesTable);

  const [{ lowStockCount }] = await db
    .select({ lowStockCount: count() })
    .from(medicinesTable)
    .where(lte(medicinesTable.quantity, medicinesTable.minQuantity));

  const [{ expiringSoonCount }] = await db
    .select({ expiringSoonCount: count() })
    .from(medicinesTable)
    .where(sql`${medicinesTable.expiryDate} <= (CURRENT_DATE + INTERVAL '90 days')`);

  const [{ totalCustomers }] = await db
    .select({ totalCustomers: count() })
    .from(customersTable);

  const [todayStats] = await db
    .select({ total: sum(salesTable.total), cnt: count() })
    .from(salesTable)
    .where(sql`${salesTable.createdAt} >= CURRENT_DATE`);

  const [{ totalRevenue }] = await db
    .select({ totalRevenue: sum(salesTable.total) })
    .from(salesTable);

  const recentSalesRaw = await db
    .select({
      id: salesTable.id,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      paymentMethod: salesTable.paymentMethod,
      total: salesTable.total,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .orderBy(desc(salesTable.createdAt))
    .limit(5);

  const recentSaleIds = recentSalesRaw.map((s) => s.id);
  const recentItems = recentSaleIds.length
    ? await db.select().from(saleItemsTable).where(inArray(saleItemsTable.saleId, recentSaleIds))
    : [];

  const recentSales = recentSalesRaw.map((sale) => ({
    ...sale,
    total: Number(sale.total),
    items: recentItems
      .filter((item) => item.saleId === sale.id)
      .map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
  }));

  const stats = {
    totalMedicines,
    lowStockCount,
    expiringSoonCount,
    todaySalesTotal: Number(todayStats?.total ?? 0),
    todaySalesCount: todayStats?.cnt ?? 0,
    totalRevenue: Number(totalRevenue ?? 0),
    totalCustomers,
    recentSales,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
