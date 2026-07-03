import { Router, type IRouter } from "express";
import { eq, lte, and, sql } from "drizzle-orm";
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

function serializeMedicine<T extends { purchasePrice: string; sellingPrice: string }>(medicine: T) {
  return {
    ...medicine,
    purchasePrice: Number(medicine.purchasePrice),
    sellingPrice: Number(medicine.sellingPrice),
  };
}

router.get("/medicines", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const medicines = search
    ? await db
        .select()
        .from(medicinesTable)
        .where(sql`${medicinesTable.name} ILIKE ${"%" + search + "%"} OR ${medicinesTable.barcode} ILIKE ${"%" + search + "%"}`)
        .orderBy(medicinesTable.name)
    : await db.select().from(medicinesTable).orderBy(medicinesTable.name);

  res.json(ListMedicinesResponse.parse(medicines.map(serializeMedicine)));
});

router.get("/medicines/low-stock", async (_req, res): Promise<void> => {
  const medicines = await db
    .select()
    .from(medicinesTable)
    .where(lte(medicinesTable.quantity, medicinesTable.minQuantity))
    .orderBy(medicinesTable.name);

  res.json(ListMedicinesResponse.parse(medicines.map(serializeMedicine)));
});

router.get("/medicines/expiring-soon", async (_req, res): Promise<void> => {
  const medicines = await db
    .select()
    .from(medicinesTable)
    .where(sql`${medicinesTable.expiryDate} <= (CURRENT_DATE + INTERVAL '90 days')`)
    .orderBy(medicinesTable.expiryDate);

  res.json(ListMedicinesResponse.parse(medicines.map(serializeMedicine)));
});

router.post("/medicines", async (req, res): Promise<void> => {
  const parsed = CreateMedicineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [medicine] = await db
    .insert(medicinesTable)
    .values({
      ...parsed.data,
      purchasePrice: String(parsed.data.purchasePrice),
      sellingPrice: String(parsed.data.sellingPrice),
      expiryDate: parsed.data.expiryDate.toISOString().slice(0, 10),
    })
    .returning();

  res.status(201).json(CreateMedicineResponse.parse(medicine));
});

router.get("/medicines/:id", async (req, res): Promise<void> => {
  const params = GetMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [medicine] = await db.select().from(medicinesTable).where(eq(medicinesTable.id, params.data.id));

  if (!medicine) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }

  res.json(GetMedicineResponse.parse(medicine));
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

  if (!medicine) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }

  res.json(UpdateMedicineResponse.parse(medicine));
});

router.delete("/medicines/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [medicine] = await db.delete(medicinesTable).where(eq(medicinesTable.id, params.data.id)).returning();

  if (!medicine) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
