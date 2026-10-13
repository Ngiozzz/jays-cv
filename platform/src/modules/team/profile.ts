import { z } from "zod";

// What people can change about themselves on their profile
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(40),
  lastName: z.string().trim().min(1, "Enter your last name").max(40),
  nickname: z.string().trim().max(40),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^(\+?254|0)[17]\d{8}$/, "Enter a Kenyan phone number, e.g. 0712 345 678")
        .or(z.literal("")),
    ),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// The name the team sees: the nickname when there is one, otherwise the full name
export function displayNameOf(input: Pick<ProfileInput, "firstName" | "lastName" | "nickname">) {
  return input.nickname || `${input.firstName} ${input.lastName}`;
}

// Members who joined before first/last names existed only have one name; split it once
export function splitName(name: string) {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(" ") };
}
