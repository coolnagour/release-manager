
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Application, ApplicationUser } from "@/types/application";
import { UserProfile } from "@/types/user-profile";
import { Role } from "@/types/roles";

const userSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

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
  users: z.array(userSchema),
});

export async function createApp(values: z.infer<typeof formSchema>, ownerId: string, ownerEmail: string) {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }

  const { appName, packageName, users } = validatedFields.data;

  // Ensure the owner is always in the list as an admin
  const ownerInList = users.some(u => u.email === ownerEmail);
  if (!ownerInList) {
    users.push({ email: ownerEmail, role: Role.ADMIN });
  } else {
    // Make sure the owner's role is admin
    const ownerEntry = users.find(u => u.email === ownerEmail);
    if (ownerEntry) {
      ownerEntry.role = Role.ADMIN;
    }
  }

  try {
    await db.createApp({
      name: appName,
      packageName,
      ownerId,
      users,
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

export async function updateApp(appId: string, values: z.infer<typeof formSchema>, currentUser: UserProfile) {
    const validatedFields = formSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            error: "Invalid fields!",
        };
    }

    const app = await db.getApp(appId);
    if (!app) {
        return { error: "App not found." };
    }
    
    const currentUserRoleInApp = currentUser.roles?.[appId];
    if (!currentUser.isSuperAdmin && currentUserRoleInApp !== Role.ADMIN) {
        return { error: "Unauthorized." };
    }

    const { appName, packageName, users: newUsers } = validatedFields.data;
    
    if (!currentUser.isSuperAdmin && !newUsers.some(u => u.email === currentUser.email)) {
        return { error: "You cannot remove yourself from an application." };
    }
    
    const owner = await db.getUser(app.ownerId);
    if (owner?.email && !newUsers.some(u => u.email === owner.email)) {
        newUsers.push({ email: owner.email, role: Role.ADMIN });
    }

    try {
        await db.updateApp(appId, {
            name: appName,
            packageName,
            users: newUsers,
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

export async function getAppsForUser(userId: string) {
    return await db.getAppsForUser(userId);
}

export async function getApp(appId: string): Promise<Application | null> {
    return await db.getApp(appId);
}

export async function findOrCreateUser(
  user: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">
): Promise<UserProfile | null> {
  return await db.findOrCreateUser(user);
}

export async function getDriverDistribution(appId: string): Promise<{versionCode: number, versionName: string, count: number}[]> {
    return await db.getDriverDistribution(appId);
}
