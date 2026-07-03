import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  pharmacyName: text("pharmacy_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  taxNumber: text("tax_number").notNull().default(""),
  footerNote: text("footer_note").notNull().default(""),
});

export const updateSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
