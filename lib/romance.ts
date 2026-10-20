import { z } from "zod";
export const genders = ["Man", "Woman", "Intersex", "Non-binary", "Trans man", "Trans woman", "Transfeminine", "Transmasculine", "Other"] as const;
export const sexualities = ["Asexual", "Bisexual", "Bi-curious", "Demisexual", "Gay", "Lesbian", "Pansexual", "Straight", "Queer", "Other"] as const;
const unique = <T>(values: T[]) => new Set(values).size === values.length;
export const romanceSchema = z.object({
  genders: z.array(z.enum(genders)).max(genders.length).refine(unique).default([]),
  sexualities: z.array(z.enum(sexualities)).max(sexualities.length).refine(unique).default([]),
  interested_sexualities: z.array(z.enum(sexualities)).max(sexualities.length).refine(unique).optional(),
  interested_in: z.array(z.enum(genders)).max(genders.length).refine(unique).default([]),
}).strict();
export type Romance = z.infer<typeof romanceSchema>;
// Only explicit selections establish attraction; orientation labels are not rules.
export function acceptsGenders(preference: Romance | undefined, identity: Romance | undefined) {
  if (!preference?.interested_in.length) return true;
  return Boolean(identity?.genders.some(gender => preference.interested_in.includes(gender)));
}

export function acceptsSexualities(preference: Romance | undefined, identity: Romance | undefined) {
  if (!preference?.interested_sexualities?.length) return true;
  return Boolean(identity?.sexualities.some(value => preference.interested_sexualities!.includes(value)));
}
export function mutuallyCompatible(a: Romance | undefined, b: Romance | undefined) {
  return acceptsGenders(a, b) && acceptsGenders(b, a) && acceptsSexualities(a, b) && acceptsSexualities(b, a);
}
