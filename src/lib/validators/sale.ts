import { z } from "zod";

export const saleSchema = z.object({
  variantId: z.string().uuid(),
  salePrice: z.coerce.number().min(0, "Le prix de vente est requis"),
  saleDate: z.string().min(1, "La date est requise"),
  platform: z.enum(["stockx", "vinted", "ebay", "laced", "hypeboost", "alias", "leboncoin", "vestiaire", "fb_groups", "direct", "discord", "other"]).optional(),
  buyerUsername: z.string().optional(),
  paymentStatus: z.enum(["paid", "pending"]).optional(),
  platformFee: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  otherFees: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  paymentMethod: z.enum(["virement", "paypal", "cash", "crypto", "carte", "platform_default", "other"]).optional(),
});

export type SaleFormData = z.infer<typeof saleSchema>;
