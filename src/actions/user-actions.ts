
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const CreateUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  isSuperAdmin: z.boolean().default(false),
});

export async function createUser(values: z.infer<typeof CreateUserSchema>) {
    const validatedFields = CreateUserSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields provided." };
    }

    const { email, isSuperAdmin } = validatedFields.data;

    try {
        await db.createUser({ email, isSuperAdmin });
    } catch (error: any) {
        console.error("Failed to create user:", error);
        // Check for unique constraint error
        if (error.message?.includes('UNIQUE constraint failed: users.email')) {
             return { error: "A user with this email already exists." };
        }
        return { error: "Failed to create the user." };
    }

    revalidatePath("/admin/users");
    return { success: `User with email ${email} created successfully!` };
}
