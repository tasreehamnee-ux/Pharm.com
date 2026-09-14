import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import {
  CreateSupplierBody,
  UpdateSupplierBody,
  GetSupplierParams,
  UpdateSupplierParams,
  DeleteSupplierParams,
  ListSuppliersResponse,
  GetSupplierResponse,
  CreateSupplierResponse,
  UpdateSupplierResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const mockSuppliers: Array<{
  id: number;
  name: string;
  phone: string;
  address?: string | null;
  createdAt: Date;
}> = [
  { id: 1, name: "شركة سبيماكو الدوائية", phone: "0112223344", address: "الرياض", createdAt: new Date() },
  { id: 2, name: "شركة الموارد الطبية", phone: "0125556677", address: "جدة", createdAt: new Date() },
];
let nextSupplierId = 3;

const isDbAvailable = () => Boolean(process.env.DATABASE_URL);

router.get("/suppliers", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
      res.json(ListSuppliersResponse.parse(suppliers));
      return;
    } catch (e) {}
  }
  res.json(ListSuppliersResponse.parse(mockSuppliers));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [supplier] = await db.insert(suppliersTable).values(parsed.data).returning();
      res.status(201).json(CreateSupplierResponse.parse(supplier));
      return;
    } catch (e) {}
  }

  const newSupp = {
    id: nextSupplierId++,
    ...parsed.data,
    createdAt: new Date(),
  };
  mockSuppliers.push(newSupp);
  res.status(201).json(CreateSupplierResponse.parse(newSupp));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, params.data.id));
      if (supplier) {
        res.json(GetSupplierResponse.parse(supplier));
        return;
      }
    } catch (e) {}
  }

  const supplier = mockSuppliers.find((s) => s.id === params.data.id);
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json(GetSupplierResponse.parse(supplier));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [supplier] = await db
        .update(suppliersTable)
        .set(parsed.data)
        .where(eq(suppliersTable.id, params.data.id))
        .returning();

      if (supplier) {
        res.json(UpdateSupplierResponse.parse(supplier));
        return;
      }
    } catch (e) {}
  }

  const index = mockSuppliers.findIndex((s) => s.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  mockSuppliers[index] = { ...mockSuppliers[index], ...parsed.data };
  res.json(UpdateSupplierResponse.parse(mockSuppliers[index]));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [supplier] = await db.delete(suppliersTable).where(eq(suppliersTable.id, params.data.id)).returning();
      if (supplier) {
        res.sendStatus(204);
        return;
      }
    } catch (e) {}
  }

  const index = mockSuppliers.findIndex((s) => s.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  mockSuppliers.splice(index, 1);
  res.sendStatus(204);
});

export default router;
