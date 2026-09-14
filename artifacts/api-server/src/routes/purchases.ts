import { Router, type IRouter } from "express";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { db, purchasesTable, purchaseItemsTable, medicinesTable, suppliersTable } from "@workspace/db";
import {
  CreatePurchaseBody,
  GetPurchaseParams,
  ListPurchasesResponse,
  GetPurchaseResponse,
  CreatePurchaseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const mockPurchases: Array<{
  id: number;
  supplierId: number;
  supplierName: string;
  total: number;
  createdAt: Date;
  items: Array<{
    id: number;
    purchaseId: number;
    medicineId: number;
    medicineName: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
  }>;
}> = [
  {
    id: 1,
    supplierId: 1,
    supplierName: "شركة أدوية سامراء (SDI)",
    total: 240.00,
    createdAt: new Date(),
    items: [
      { id: 1, purchaseId: 1, medicineId: 1, medicineName: "بانادول إكسترا (Panadol Extra)", quantity: 20, unitCost: 12.00, subtotal: 240.00 },
    ],
  },
];
let nextPurchaseId = 2;
let nextPurchaseItemId = 2;

const isDbAvailable = () => Boolean(process.env.DATABASE_URL);

function serializePurchase<T extends { total: string | number; items: { unitCost: string | number; subtotal: string | number }[] }>(purchase: T) {
  return {
    ...purchase,
    total: Number(purchase.total),
    items: purchase.items.map((item) => ({
      ...item,
      unitCost: Number(item.unitCost),
      subtotal: Number(item.subtotal),
    })),
  };
}

async function hydratePurchase(purchaseId: number) {
  const [purchase] = await db
    .select({
      id: purchasesTable.id,
      supplierId: purchasesTable.supplierId,
      supplierName: suppliersTable.name,
      total: purchasesTable.total,
      createdAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .innerJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(eq(purchasesTable.id, purchaseId));

  if (!purchase) return null;

  const items = await db.select().from(purchaseItemsTable).where(eq(purchaseItemsTable.purchaseId, purchaseId));
  return { ...purchase, items };
}

router.get("/purchases", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const purchases = await db
        .select({
          id: purchasesTable.id,
          supplierId: purchasesTable.supplierId,
          supplierName: suppliersTable.name,
          total: purchasesTable.total,
          createdAt: purchasesTable.createdAt,
        })
        .from(purchasesTable)
        .innerJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
        .orderBy(desc(purchasesTable.createdAt));

      const purchaseIds = purchases.map((p) => p.id);
      const items = purchaseIds.length
        ? await db.select().from(purchaseItemsTable).where(inArray(purchaseItemsTable.purchaseId, purchaseIds))
        : [];

      const result = purchases.map((purchase) => ({
        ...purchase,
        items: items.filter((item) => item.purchaseId === purchase.id),
      }));

      res.json(ListPurchasesResponse.parse(result.map(serializePurchase)));
      return;
    } catch (e) {}
  }

  res.json(ListPurchasesResponse.parse(mockPurchases.map(serializePurchase)));
});

router.post("/purchases", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { supplierId, items } = parsed.data;

  if (isDbAvailable()) {
    try {
      const purchaseId = await db.transaction(async (tx) => {
        const medicineIds = items.map((item) => item.medicineId);
        const medicines = await tx
          .select()
          .from(medicinesTable)
          .where(inArray(medicinesTable.id, medicineIds));

        const medicineMap = new Map(medicines.map((m) => [m.id, m]));
        let total = 0;
        const resolvedItems: { medicineId: number; medicineName: string; quantity: number; unitCost: string; subtotal: string }[] = [];

        for (const item of items) {
          const medicine = medicineMap.get(item.medicineId);
          if (!medicine) throw new Error(`Medicine ${item.medicineId} not found`);

          const subtotal = item.unitCost * item.quantity;
          total += subtotal;

          resolvedItems.push({
            medicineId: medicine.id,
            medicineName: medicine.name,
            quantity: item.quantity,
            unitCost: String(item.unitCost),
            subtotal: String(subtotal),
          });
        }

        const [purchase] = await tx
          .insert(purchasesTable)
          .values({ supplierId, total: String(total) })
          .returning();

        await tx.insert(purchaseItemsTable).values(
          resolvedItems.map((item) => ({ purchaseId: purchase.id, ...item })),
        );

        for (const item of resolvedItems) {
          await tx
            .update(medicinesTable)
            .set({ quantity: sql`${medicinesTable.quantity} + ${item.quantity}` })
            .where(eq(medicinesTable.id, item.medicineId));
        }

        return purchase.id;
      });

      const purchase = await hydratePurchase(purchaseId);
      res.status(201).json(CreatePurchaseResponse.parse(purchase ? serializePurchase(purchase) : purchase));
      return;
    } catch (err) {}
  }

  let total = 0;
  const createdItems = items.map((item) => {
    const subtotal = item.unitCost * item.quantity;
    total += subtotal;
    return {
      id: nextPurchaseItemId++,
      purchaseId: nextPurchaseId,
      medicineId: item.medicineId,
      medicineName: `دواء ${item.medicineId}`,
      quantity: item.quantity,
      unitCost: item.unitCost,
      subtotal,
    };
  });

  const newPurchase = {
    id: nextPurchaseId++,
    supplierId,
    supplierName: supplierId === 1 ? "شركة أدوية سامراء (SDI)" : "شركة الأدوية العراقية",
    total,
    createdAt: new Date(),
    items: createdItems,
  };

  mockPurchases.unshift(newPurchase);
  res.status(201).json(CreatePurchaseResponse.parse(serializePurchase(newPurchase)));
});

router.get("/purchases/:id", async (req, res): Promise<void> => {
  const params = GetPurchaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const purchase = await hydratePurchase(params.data.id);
      if (purchase) {
        res.json(GetPurchaseResponse.parse(serializePurchase(purchase)));
        return;
      }
    } catch (e) {}
  }

  const purchase = mockPurchases.find((p) => p.id === params.data.id);
  if (!purchase) {
    res.status(404).json({ error: "Purchase not found" });
    return;
  }

  res.json(GetPurchaseResponse.parse(serializePurchase(purchase)));
});

export default router;
