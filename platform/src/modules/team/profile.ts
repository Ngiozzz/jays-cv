import { z } from "zod";

// What people can change about themselves on their profile
export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^(\+?254|0)[17]\d{8}$/, "Enter a Kenyan WhatsApp number, e.g. 0712 345 678")
        .or(z.literal("")),
    ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
