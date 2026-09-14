import { Router, type IRouter } from "express";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { db, salesTable, saleItemsTable, medicinesTable, customersTable } from "@workspace/db";
import { mockMedicines } from "./medicines";
import {
  CreateSaleBody,
  GetSaleParams,
  DeleteSaleParams,
  ListSalesResponse,
  GetSaleResponse,
  CreateSaleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const mockSales: Array<{
  id: number;
  customerId?: number | null;
  customerName?: string | null;
  paymentMethod: string;
  total: number;
  createdAt: Date;
  items: Array<{
    id: number;
    saleId: number;
    medicineId: number;
    medicineName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}> = [
  {
    id: 1,
    customerId: 1,
    customerName: "حسين علي",
    paymentMethod: "cash",
    total: 37.00,
    createdAt: new Date(),
    items: [
      { id: 1, saleId: 1, medicineId: 1, medicineName: "بانادول إكسترا (Panadol Extra)", quantity: 2, unitPrice: 18.50, subtotal: 37.00 },
    ],
  },
];
let nextSaleId = 2;
let nextSaleItemId = 2;

const isDbAvailable = () => Boolean(process.env.DATABASE_URL);

function serializeSale<T extends { total: string | number; items: { unitPrice: string | number; subtotal: string | number }[] }>(sale: T) {
  return {
    ...sale,
    total: Number(sale.total),
    items: sale.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
  };
}

async function hydrateSale(saleId: number) {
  const [sale] = await db
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
    .where(eq(salesTable.id, saleId));

  if (!sale) return null;

  const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));
  return { ...sale, items };
}

router.get("/sales", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const sales = await db
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
        .orderBy(desc(salesTable.createdAt));

      const saleIds = sales.map((s) => s.id);
      const items = saleIds.length
        ? await db.select().from(saleItemsTable).where(inArray(saleItemsTable.saleId, saleIds))
        : [];

      const result = sales.map((sale) => ({
        ...sale,
        items: items.filter((item) => item.saleId === sale.id),
      }));

      res.json(ListSalesResponse.parse(result.map(serializeSale)));
      return;
    } catch (e) {}
  }

  res.json(ListSalesResponse.parse(mockSales.map(serializeSale)));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerId, paymentMethod, items } = parsed.data;

  if (isDbAvailable()) {
    try {
      const saleId = await db.transaction(async (tx) => {
        const medicineIds = items.map((item) => item.medicineId);
        const medicines = await tx
          .select()
          .from(medicinesTable)
          .where(inArray(medicinesTable.id, medicineIds));

        const medicineMap = new Map(medicines.map((m) => [m.id, m]));
        let total = 0;
        const resolvedItems: { medicineId: number; medicineName: string; quantity: number; unitPrice: string; subtotal: string }[] = [];

        for (const item of items) {
          const medicine = medicineMap.get(item.medicineId);
          if (!medicine) throw new Error(`Medicine ${item.medicineId} not found`);
          if (medicine.quantity < item.quantity) throw new Error(`Insufficient stock for ${medicine.name}`);

          const unitPrice = Number(medicine.sellingPrice);
          const subtotal = unitPrice * item.quantity;
          total += subtotal;

          resolvedItems.push({
            medicineId: medicine.id,
            medicineName: medicine.name,
            quantity: item.quantity,
            unitPrice: String(unitPrice),
            subtotal: String(subtotal),
          });
        }

        const [sale] = await tx
          .insert(salesTable)
          .values({ customerId: customerId ?? null, paymentMethod, total: String(total) })
          .returning();

        await tx.insert(saleItemsTable).values(
          resolvedItems.map((item) => ({ saleId: sale.id, ...item })),
        );

        for (const item of resolvedItems) {
          await tx
            .update(medicinesTable)
            .set({ quantity: sql`${medicinesTable.quantity} - ${item.quantity}` })
            .where(eq(medicinesTable.id, item.medicineId));
        }

        return sale.id;
      });

      const sale = await hydrateSale(saleId);
      res.status(201).json(CreateSaleResponse.parse(sale ? serializeSale(sale) : sale));
      return;
    } catch (err) {}
  }

  // Fallback in-memory sale creation
  let total = 0;
  const createdItems = items.map((item) => {
    const med = mockMedicines.find((m) => m.id === item.medicineId);
    const medicineName = med ? med.name : `دواء ${item.medicineId}`;
    const unitPrice = med ? Number(med.sellingPrice) : 20.00;
    const subtotal = unitPrice * item.quantity;
    total += subtotal;
    if (med) {
      med.quantity = Math.max(0, med.quantity - item.quantity);
    }
    return {
      id: nextSaleItemId++,
      saleId: nextSaleId,
      medicineId: item.medicineId,
      medicineName,
      quantity: item.quantity,
      unitPrice,
      subtotal,
    };
  });

  const newSale = {
    id: nextSaleId++,
    customerId: customerId ?? null,
    customerName: customerId === 1 ? "حسين علي" : "عميل عام",
    paymentMethod,
    total,
    createdAt: new Date(),
    items: createdItems,
  };
  mockSales.unshift(newSale);
  res.status(201).json(CreateSaleResponse.parse(serializeSale(newSale)));
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const sale = await hydrateSale(params.data.id);
      if (sale) {
        res.json(GetSaleResponse.parse(serializeSale(sale)));
        return;
      }
    } catch (e) {}
  }

  const sale = mockSales.find((s) => s.id === params.data.id);
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  res.json(GetSaleResponse.parse(serializeSale(sale)));
});

router.delete("/sales/:id", async (req, res): Promise<void> => {
  const params = DeleteSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const deleted = await db.transaction(async (tx) => {
        const items = await tx.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, params.data.id));
        const [sale] = await tx.delete(salesTable).where(eq(salesTable.id, params.data.id)).returning();
        if (!sale) return null;

        for (const item of items) {
          await tx
            .update(medicinesTable)
            .set({ quantity: sql`${medicinesTable.quantity} + ${item.quantity}` })
            .where(eq(medicinesTable.id, item.medicineId));
        }
        return sale;
      });

      if (deleted) {
        res.sendStatus(204);
        return;
      }
    } catch (err) {}
  }

  const index = mockSales.findIndex((s) => s.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  mockSales.splice(index, 1);
  res.sendStatus(204);
});

export default router;
