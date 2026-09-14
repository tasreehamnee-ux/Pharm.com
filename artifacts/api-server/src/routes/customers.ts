import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  DeleteCustomerParams,
  ListCustomersResponse,
  GetCustomerResponse,
  CreateCustomerResponse,
  UpdateCustomerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const mockCustomers: Array<{
  id: number;
  name: string;
  phone: string;
  address?: string | null;
  createdAt: Date;
}> = [
  { id: 1, name: "صفاء هادي", phone: "07701234567", address: "بغداد - المنصور", createdAt: new Date() },
  { id: 2, name: "أحمد الكرخي", phone: "07809876543", address: "بغداد - الكرادة", createdAt: new Date() },
  { id: 3, name: "علي الحسيني", phone: "07711223344", address: "البصرة - الجزاير", createdAt: new Date() },
];
let nextCustomerId = 4;


const isDbAvailable = () => Boolean(process.env.DATABASE_URL);

router.get("/customers", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const customers = await db.select().from(customersTable).orderBy(customersTable.name);
      res.json(ListCustomersResponse.parse(customers));
      return;
    } catch (e) {}
  }
  res.json(ListCustomersResponse.parse(mockCustomers));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [customer] = await db.insert(customersTable).values(parsed.data).returning();
      res.status(201).json(CreateCustomerResponse.parse(customer));
      return;
    } catch (e) {}
  }

  const newCust = {
    id: nextCustomerId++,
    ...parsed.data,
    createdAt: new Date(),
  };
  mockCustomers.push(newCust);
  res.status(201).json(CreateCustomerResponse.parse(newCust));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
      if (customer) {
        res.json(GetCustomerResponse.parse(customer));
        return;
      }
    } catch (e) {}
  }

  const customer = mockCustomers.find((c) => c.id === params.data.id);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(GetCustomerResponse.parse(customer));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [customer] = await db
        .update(customersTable)
        .set(parsed.data)
        .where(eq(customersTable.id, params.data.id))
        .returning();

      if (customer) {
        res.json(UpdateCustomerResponse.parse(customer));
        return;
      }
    } catch (e) {}
  }

  const index = mockCustomers.findIndex((c) => c.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  mockCustomers[index] = { ...mockCustomers[index], ...parsed.data };
  res.json(UpdateCustomerResponse.parse(mockCustomers[index]));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const [customer] = await db.delete(customersTable).where(eq(customersTable.id, params.data.id)).returning();
      if (customer) {
        res.sendStatus(204);
        return;
      }
    } catch (e) {}
  }

  const index = mockCustomers.findIndex((c) => c.id === params.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  mockCustomers.splice(index, 1);
  res.sendStatus(204);
});

export default router;
