"use server";

import { z } from "zod";
import { auth } from "firebase-admin";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const formSchema = z.object({
  appName: z.string().min(2, {
    message: "App name must be at least 2 characters.",
  }),
  packageName: z
    .string()
    .min(2, {
      message: "Package name must be at least 2 characters.",
    })
    .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i, {
      message: "Invalid package name format.",
    }),
  allowedEmails: z.string().min(1, {
    message: "Please enter at least one email address.",
  }),
});

export async function createApp(values: z.infer<typeof formSchema>, ownerId: string, ownerEmail: string) {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }

  const { appName, packageName, allowedEmails } = validatedFields.data;

  const emailList = allowedEmails.split(",").map((email) => email.trim());

  if (!emailList.includes(ownerEmail)) {
    emailList.push(ownerEmail);
  }

  try {
    await db.createApp({
      name: appName,
      packageName,
      allowedEmails: emailList,
      ownerId,
    });
  } catch (error) {
    console.error("Failed to create application:", error);
    return {
      error: "Failed to create application.",
    };
  }
  
  revalidatePath("/");

  return {
    success: "Application created successfully!",
  };
}

export async function getApps(userEmail: string) {
    return await db.getAppsForUser(userEmail);
}
