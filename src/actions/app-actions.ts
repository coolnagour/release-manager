
"use server";

import { z } from "zod";
import { auth } from "firebase-admin";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Application } from "@/types/application";
import { UserProfile } from "@/types/user-profile";

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
  users: z.string().min(1, {
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

  const { appName, packageName, users } = validatedFields.data;

  const emailList = users.split(",").map((email) => email.trim()).filter(email => email);

  if (!emailList.includes(ownerEmail)) {
    emailList.push(ownerEmail);
  }

  try {
    await db.createApp({
      name: appName,
      packageName,
      users: emailList,
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

export async function updateApp(appId: string, values: z.infer<typeof formSchema>, userEmail: string) {
    const validatedFields = formSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            error: "Invalid fields!",
        };
    }

    const app = await db.getApp(appId);
    if (!app || !app.users.includes(userEmail)) {
        return {
            error: "Unauthorized or app not found.",
        }
    }

    const { appName, packageName, users } = validatedFields.data;
    const emailList = users.split(",").map((email) => email.trim());

    if (!emailList.includes(app.ownerId)) {
        const owner = await auth().getUser(app.ownerId);
        if (owner.email && !emailList.includes(owner.email)) {
            emailList.push(owner.email);
        }
    }

    try {
        await db.updateApp(appId, {
            name: appName,
            packageName,
            users: emailList,
        });
    } catch (error) {
        console.error("Failed to update application:", error);
        return {
            error: "Failed to update application.",
        };
    }

    revalidatePath(`/app/${appId}/edit`);
    revalidatePath("/");

    return {
        success: "Application updated successfully!",
    };
}

export async function getApps(userEmail: string) {
    return await db.getAppsForUser(userEmail);
}

export async function getApp(appId: string): Promise<Application | null> {
    return await db.getApp(appId);
}

export async function findOrCreateUser(
  user: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">
): Promise<UserProfile> {
  return await db.findOrCreateUser(user);
}
