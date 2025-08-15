
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Release, ReleaseStatus } from "@/types/release";
import { getInternalTrack } from "@/lib/google-play";

const formSchema = z.object({
  versionName: z.string().min(1, {
    message: "Version name is required.",
  }),
  versionCode: z.string().min(1, {
    message: "Version code is required.",
  }),
  status: z.nativeEnum(ReleaseStatus),
});

export async function createRelease(appId: string, values: z.infer<typeof formSchema>): Promise<{ data?: Release, error?: string }> {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }

  const { versionName, versionCode, status } = validatedFields.data;

  try {
    const newRelease = await db.createRelease(appId, {
      versionName,
      versionCode,
      status,
    });
    revalidatePath(`/app/${appId}/releases`);
    return { data: newRelease };
  } catch (error) {
    console.error("Failed to create release:", error);
    return {
      error: "Failed to create release.",
    };
  }
}

export async function getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }> {
    return await db.getReleasesForApp(appId, page, limit);
}

export async function updateRelease(appId: string, releaseId: string, values: z.infer<typeof formSchema>): Promise<{ data?: Release, error?: string }> {
    const validatedFields = formSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    try {
        const updatedRelease = await db.updateRelease(appId, releaseId, validatedFields.data);
        revalidatePath(`/app/${appId}/releases`);
        return { data: updatedRelease };
    } catch (error) {
        console.error("Failed to update release:", error);
        return { error: "Failed to update release." };
    }
}

export async function deleteRelease(appId: string, releaseId: string): Promise<{ success?: boolean, error?: string }> {
    try {
        await db.deleteRelease(appId, releaseId);
        revalidatePath(`/app/${appId}/releases`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete release:", error);
        return { error: "Failed to delete release." };
    }
}

export async function getInternalTrackVersionCodes(packageName: string): Promise<{ data?: (number | string)[], error?: string }> {
    const result = await getInternalTrack(packageName);
    if (result.error) {
        return { error: result.error };
    }
    
    const versionCodes = result.data?.releases
        ?.flatMap(r => r.versionCodes || [])
        .filter((vc): vc is string => !!vc) // Ensure version codes are strings
        .map(vc => parseInt(vc, 10))
        .filter((vc): vc is number => !isNaN(vc));

    return { data: versionCodes || [] };
}
