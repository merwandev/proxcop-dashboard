import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  sku: z.string().optional(),
  category: z.enum(["sneakers", "pokemon", "lego", "random"]),
  sizeVariant: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, "Le prix doit etre positif"),
  purchaseDate: z.string().min(1, "La date est requise"),
  targetPrice: z.coerce.number().min(0).optional(),
  shippingFee: z.coerce.number().min(0).default(0),
  platformFee: z.coerce.number().min(0).default(0),
  platform: z.enum(["stockx", "vinted", "ebay", "laced", "hypeboost", "alias", "other"]).optional(),
  status: z
    .enum(["en_stock", "liste", "reserve", "vendu", "en_litige", "return_waiting_rf", "hold"])
    .default("en_stock"),
  storageLocation: z.string().optional(),
  returnDeadline: z.string().optional(),
  notes: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
