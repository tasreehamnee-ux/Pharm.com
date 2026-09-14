import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

let mockSettings = {
  id: 1,
  pharmacyName: "صيدلية فارما",
  phone: "6654333445",
  address: "السماوة الغربي",
  taxNumber: "",
  footerNote: "شكراً لزيارتكم — لا يقبل الإرجاع بعد 24 ساعة",
};

const isDbAvailable = () => Boolean(process.env.DATABASE_URL);

async function getOrCreateSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(settingsTable)
    .values({ pharmacyName: "", phone: "", address: "", taxNumber: "", footerNote: "" })
    .returning();
  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  if (isDbAvailable()) {
    try {
      const settings = await getOrCreateSettings();
      res.json(GetSettingsResponse.parse(settings));
      return;
    } catch (e) {}
  }

  res.json(GetSettingsResponse.parse(mockSettings));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isDbAvailable()) {
    try {
      const existing = await getOrCreateSettings();
      const [updated] = await db
        .update(settingsTable)
        .set(parsed.data)
        .where(eq(settingsTable.id, existing.id))
        .returning();

      res.json(UpdateSettingsResponse.parse(updated));
      return;
    } catch (e) {}
  }

  mockSettings = {
    ...mockSettings,
    ...parsed.data,
  };

  res.json(UpdateSettingsResponse.parse(mockSettings));
});

export default router;
