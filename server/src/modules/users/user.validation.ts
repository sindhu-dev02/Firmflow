import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["employee", "customer"]), // never org_owner or super_admin via invite
  }),
});

export const updateMemberSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
      email: z.string().trim().email("Enter a valid email").optional(),
    })
    .refine((v) => v.name !== undefined || v.email !== undefined, {
      message: "Send a name or an email to change",
    }),
});