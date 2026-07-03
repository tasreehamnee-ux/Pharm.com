import { db, medicinesTable, customersTable, suppliersTable } from "@workspace/db";

async function seed() {
  const existingMedicines = await db.select().from(medicinesTable);
  if (existingMedicines.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  await db.insert(medicinesTable).values([
    {
      name: "باراسيتامول 500 ملغ",
      category: "مسكنات",
      manufacturer: "شركة الدواء العربية",
      barcode: "6281000000011",
      unit: "علبة",
      quantity: 120,
      minQuantity: 20,
      purchasePrice: "2.50",
      sellingPrice: "4.00",
      expiryDate: "2027-03-15",
      batchNumber: "B2024-01",
    },
    {
      name: "أموكسيسيلين 250 ملغ",
      category: "مضادات حيوية",
      manufacturer: "مصنع الشفاء",
      barcode: "6281000000028",
      unit: "علبة",
      quantity: 8,
      minQuantity: 15,
      purchasePrice: "5.00",
      sellingPrice: "8.50",
      expiryDate: "2026-08-20",
      batchNumber: "B2024-02",
    },
    {
      name: "فيتامين سي 1000 ملغ",
      category: "فيتامينات",
      manufacturer: "شركة الحياة الصحية",
      barcode: "6281000000035",
      unit: "علبة",
      quantity: 60,
      minQuantity: 10,
      purchasePrice: "6.00",
      sellingPrice: "10.00",
      expiryDate: "2026-07-25",
      batchNumber: "B2024-03",
    },
    {
      name: "شراب الكحة للأطفال",
      category: "أدوية الأطفال",
      manufacturer: "شركة الدواء العربية",
      barcode: "6281000000042",
      unit: "زجاجة",
      quantity: 25,
      minQuantity: 10,
      purchasePrice: "7.50",
      sellingPrice: "12.00",
      expiryDate: "2026-12-01",
      batchNumber: "B2024-04",
    },
    {
      name: "أوميبرازول 20 ملغ",
      category: "أدوية الجهاز الهضمي",
      manufacturer: "مصنع الشفاء",
      barcode: "6281000000059",
      unit: "علبة",
      quantity: 45,
      minQuantity: 15,
      purchasePrice: "4.00",
      sellingPrice: "7.00",
      expiryDate: "2027-01-10",
      batchNumber: "B2024-05",
    },
  ]);

  await db.insert(customersTable).values([
    { name: "أحمد محمد علي", phone: "0501234567", address: "شارع الملك فهد، الرياض" },
    { name: "سارة عبدالله", phone: "0559876543", address: "حي النزهة، جدة" },
    { name: "خالد إبراهيم", phone: "0533456789", address: "حي الروضة، الدمام" },
  ]);

  await db.insert(suppliersTable).values([
    { name: "شركة الدواء العربية للتوزيع", phone: "0112345678", address: "المنطقة الصناعية، الرياض" },
    { name: "مصنع الشفاء للأدوية", phone: "0126789012", address: "المنطقة الصناعية الثانية، جدة" },
  ]);

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
