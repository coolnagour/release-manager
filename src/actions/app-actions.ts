
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

  // Ensure the owner is always in the list as a superadmin
  const ownerInList = users.some(u => u.email === ownerEmail);
  if (!ownerInList) {
    users.push({ email: ownerEmail, role: Role.SUPERADMIN });
  } else {
    // Make sure the owner's role is superadmin
    const ownerEntry = users.find(u => u.email === ownerEmail);
    if (ownerEntry) {
      ownerEntry.role = Role.SUPERADMIN;
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
    if (!currentUserRoleInApp) {
        return { error: "Unauthorized." };
    }

    const { appName, packageName, users: newUsers } = validatedFields.data;
    
    // Ensure the current user cannot remove themselves
    if (!newUsers.some(u => u.email === currentUser.email)) {
        return { error: "You cannot remove yourself from an application." };
    }
    
    // Ensure owner is not removed
    const owner = await db.getUser(app.ownerId);
    if (owner?.email && !newUsers.some(u => u.email === owner.email)) {
        newUsers.push({ email: owner.email, role: Role.SUPERADMIN });
    }
    
    // Admins cannot remove or demote Super Admins
    if (currentUserRoleInApp === Role.ADMIN) {
        const originalSuperAdmins = app.users.filter(u => u.role === Role.SUPERADMIN);
        for (const sa of originalSuperAdmins) {
            const newUserEntry = newUsers.find(u => u.email === sa.email);
            if (!newUserEntry) {
                return { error: `Admins cannot remove Super Admin "${sa.email}".` };
            }
            if (newUserEntry.role !== Role.SUPERADMIN) {
                 return { error: `Admins cannot change the role of Super Admin "${sa.email}".` };
            }
        }
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
