import { z } from "zod";

// Schema for a single variant input in the creation form
export const variantInputSchema = z.object({
  sizeVariant: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, "Le prix doit etre positif"),
  quantity: z.coerce.number().int().min(1).default(1),
  storageLocation: z.string().optional(),
});

// Schema for creating a product with multiple variants
export const createProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.enum(["sneakers", "pokemon", "lego", "random"]),
  purchaseDate: z.string().min(1, "La date est requise"),
  targetPrice: z.coerce.number().min(0).optional(),
  returnDeadline: z.string().optional(),
  notes: z.string().optional(),
  variants: z.array(variantInputSchema).min(1, "Au moins 1 taille requise"),
});

// Schema for updating a parent product (info only)
export const updateProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.enum(["sneakers", "pokemon", "lego", "random"]),
  notes: z.string().optional(),
});

// Schema for updating a single variant
export const updateVariantSchema = z.object({
  sizeVariant: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, "Le prix doit etre positif"),
  purchaseDate: z.string().min(1, "La date est requise"),
  targetPrice: z.coerce.number().min(0).optional(),
  status: z.enum(["en_stock", "liste", "reserve", "vendu", "en_litige", "return_waiting_rf", "hold"]),
  storageLocation: z.string().optional(),
  returnDeadline: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
