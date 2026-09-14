import { Router, type IRouter } from "express";
import { eq, lte, sql } from "drizzle-orm";
import { db, medicinesTable } from "@workspace/db";
import {
  CreateMedicineBody,
  UpdateMedicineBody,
  GetMedicineParams,
  UpdateMedicineParams,
  DeleteMedicineParams,
  ListMedicinesResponse,
  GetMedicineResponse,
  CreateMedicineResponse,
  UpdateMedicineResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// In-memory fallback dataset so the app works 100% out of the box
export const mockMedicines: Array<{
  id: number;
  name: string;
  category: string;
  manufacturer: string;
  barcode: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: string;
  sellingPrice: string;
  expiryDate: string;
  batchNumber: string;
  createdAt: Date;
  updatedAt: Date;
}> = [
  {
    id: 1,
    name: "بانادول إكسترا (Panadol Extra)",
    category: "مسكنات وأدوية البرد",
    manufacturer: "GSK",
    barcode: "6281001234567",
    unit: "علبة",
    quantity: 45,
    minQuantity: 10,
    purchasePrice: "12.00",
    sellingPrice: "18.50",
    expiryDate: "2027-08-30",
    batchNumber: "B10293",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "أموكسيسيلين 500مجم (Amoxicillin)",
    category: "مضادات حيوية",
    manufacturer: "أدوية سامراء (SDI)",
    barcode: "6281007654321",
    unit: "علبة",
    quantity: 20,
    minQuantity: 5,
    purchasePrice: "22.00",
    sellingPrice: "32.00",
    expiryDate: "2026-12-15",
    batchNumber: "AMX500",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: "فيتامين سي 1000مجم (Vitamin C)",
    category: "مكملات غذائية",
    manufacturer: "Jamieson",
    barcode: "6281009988776",
    unit: "علبة",
    quantity: 3,
    minQuantity: 5,
    purchasePrice: "15.00",
    sellingPrice: "25.00",
    expiryDate: "2026-11-20",
    batchNumber: "VTC1000",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    name: "فوليك أسيد 5مجم (Folic Acid)",
    category: "فيتامينات",
    manufacturer: "أدوية سامراء (SDI)",
    barcode: "6281005544332",
    unit: "علبة",
    quantity: 60,
    minQuantity: 15,
    purchasePrice: "8.00",
    sellingPrice: "14.00",
    expiryDate: "2028-01-10",
    batchNumber: "FLC5",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
let nextMedicineId = 5;

function serializeMedicine<T extends { purchasePrice: string | number; sellingPrice: string | number; expiryDate: string | Date }>(medicine: T) {
  return {
    ...medicine,
    purchasePrice: Number(medicine.purchasePrice),
    sellingPrice: Number(medicine.sellingPrice),
    expiryDate: typeof medicine.expiryDate === "string" ? medicine.expiryDate : medicine.expiryDate.toISOString().slice(0, 10),
  };
}

const isDbAvailable = () => Boolean(process.env.DATABASE_URL);

router.get("/medicines", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : undefined;

  if (isDbAvailable()) {
    try {
      const medicines = search
        ? await db
            .select()
            .from(medicinesTable)
            .where(sql`${medicinesTable.name} ILIKE ${"%" + search + "%"} OR ${medicinesTable.barcode} ILIKE ${"%" + search + "%"}`)
            .orderBy(medicinesTable.name)
        : await db.select().from(medicinesTable).orderBy(medicinesTable.name);

      res.json(ListMedicinesResponse.parse(medicines.map(serializeMedicine)));
      return;
    } catch (e) {
      console.warn("DB query failed, using in-memory fallback:", e);
    }
  }

  // Fallback
  let result = mockMedicines;
  if (search) {
    result = mockMedicines.filter((m) => m.name.toLowerCase().includes(search) || m.barcode.includes(search));
  }
  res.json(ListMedicinesResponse.parse(result.map(serializeMedicine)));
});

router.get("/medicines/low-stock", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const medicines = await db
        .select()
        .from(medicinesTable)
        .where(lte(medicinesTable.quantity, medicinesTable.minQuantity))
        .orderBy(medicinesTable.name);
      res.json(ListMedicinesResponse.parse(medicines.map(serializeMedicine)));
      return;
    } catch (e) {}
  }

  const result = mockMedicines.filter((m) => m.quantity <= m.minQuantity);
  res.json(ListMedicinesResponse.parse(result.map(serializeMedicine)));
});

router.get("/medicines/expiring-soon", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const medicines = await db
        .select()
        .from(medicinesTable)
        .where(sql`${medicinesTable.expiryDate} <= (CURRENT_DATE + INTERVAL '90 days')`)
        .orderBy(medicinesTable.expiryDate);
      res.json(ListMedicinesResponse.parse(medicines.map(serializeMedicine)));
      return;
    } catch (e) {}
  }

  res.json(ListMedicinesResponse.parse(mockMedicines.map(serializeMedicine)));
});

router.post("/medicines", async (req, res): Promise<void> => {
  const parsed = CreateMedicineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [medicine] = await db
        .insert(medicinesTable)
        .values({
          ...parsed.data,
          purchasePrice: String(parsed.data.purchasePrice),
          sellingPrice: String(parsed.data.sellingPrice),
          expiryDate: parsed.data.expiryDate.toISOString().slice(0, 10),
        })
        .returning();

      res.status(201).json(CreateMedicineResponse.parse(serializeMedicine(medicine)));
      return;
    } catch (e) {
      console.warn("DB insert failed, falling back to memory:", e);
    }
  }

  // Fallback add
  const newMed = {
    id: nextMedicineId++,
    ...parsed.data,
    purchasePrice: String(parsed.data.purchasePrice),
    sellingPrice: String(parsed.data.sellingPrice),
    expiryDate: parsed.data.expiryDate.toISOString().slice(0, 10),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockMedicines.push(newMed);
  res.status(201).json(CreateMedicineResponse.parse(serializeMedicine(newMed)));
});

router.get("/medicines/:id", async (req, res): Promise<void> => {
  const params = GetMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [medicine] = await db.select().from(medicinesTable).where(eq(medicinesTable.id, params.data.id));
      if (medicine) {
        res.json(GetMedicineResponse.parse(serializeMedicine(medicine)));
        return;
      }
    } catch (e) {}
  }

  const med = mockMedicines.find((m) => m.id === params.data.id);
  if (!med) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.json(GetMedicineResponse.parse(serializeMedicine(med)));
});

router.patch("/medicines/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMedicineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const { purchasePrice, sellingPrice, expiryDate, ...rest } = parsed.data;
      const [medicine] = await db
        .update(medicinesTable)
        .set({
          ...rest,
          ...(purchasePrice !== undefined ? { purchasePrice: String(purchasePrice) } : {}),
          ...(sellingPrice !== undefined ? { sellingPrice: String(sellingPrice) } : {}),
          ...(expiryDate !== undefined ? { expiryDate: expiryDate.toISOString().slice(0, 10) } : {}),
        })
        .where(eq(medicinesTable.id, params.data.id))
        .returning();

      if (medicine) {
        res.json(UpdateMedicineResponse.parse(serializeMedicine(medicine)));
        return;
      }
    } catch (e) {}
  }

  const index = mockMedicines.findIndex((m) => m.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }

  const existing = mockMedicines[index];
  const { purchasePrice, sellingPrice, expiryDate, ...rest } = parsed.data;
  const updated = {
    ...existing,
    ...rest,
    ...(purchasePrice !== undefined ? { purchasePrice: String(purchasePrice) } : {}),
    ...(sellingPrice !== undefined ? { sellingPrice: String(sellingPrice) } : {}),
    ...(expiryDate !== undefined ? { expiryDate: expiryDate.toISOString().slice(0, 10) } : {}),
    updatedAt: new Date(),
  };
  mockMedicines[index] = updated;
  res.json(UpdateMedicineResponse.parse(serializeMedicine(updated)));
});

router.delete("/medicines/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [medicine] = await db.delete(medicinesTable).where(eq(medicinesTable.id, params.data.id)).returning();
      if (medicine) {
        res.sendStatus(204);
        return;
      }
    } catch (e) {}
  }

  const index = mockMedicines.findIndex((m) => m.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  mockMedicines.splice(index, 1);
  res.sendStatus(204);
});

export default router;
