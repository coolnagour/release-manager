
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Release, ReleaseStatus } from "@/types/release";
import { getInternalTrack } from "@/lib/google-play";
import { Condition } from "@/types/condition";

const formSchema = z.object({
  versionName: z.string().min(1, {
    message: "Version name is required.",
  }),
  versionCode: z.number().int().positive({
    message: "Version code must be a positive integer.",
  }),
  status: z.nativeEnum(ReleaseStatus),
  conditionIds: z.array(z.string()).default([]),
});

const evaluationContextSchema = z.object({
    country: z.string(),
    companyId: z.number(),
    driverId: z.string(),
    vehicleId: z.string(),
});

export type EvaluationContext = z.infer<typeof evaluationContextSchema>;

export async function createRelease(appId: string, values: z.infer<typeof formSchema>): Promise<{ data?: Release, error?: string }> {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }

  const { versionName, versionCode, status, conditionIds } = validatedFields.data;

  try {
    const newRelease = await db.createRelease(appId, {
      versionName,
      versionCode,
      status,
      conditionIds,
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

export async function getRelease(appId: string, releaseId: string): Promise<Release | null> {
    return await db.getRelease(appId, releaseId);
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
        revalidatePath(`/app/${appId}/releases/${releaseId}/edit`);
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

export async function getInternalTrackVersionCodes(packageName: string): Promise<{ data?: { versionCode: number; versionName?: string }[], error?: string }> {
    const result = await getInternalTrack(packageName);
    if (result.error) {
        return { error: result.error };
    }
    
    const releases = result.data?.releases?.map(release => {
        const versionCodes = release.versionCodes || [];
        return versionCodes.map(vc => ({
            versionCode: parseInt(vc, 10),
            versionName: release.name || undefined
        }));
    }).flat().filter(release => !isNaN(release.versionCode)) || [];

    return { data: releases };
}


export async function evaluateContext(appId: string, context: EvaluationContext): Promise<{data?: Release | null, error?: string}> {
    try {
        // Use the new performant query method
        const availableReleases = await db.getAvailableReleasesForContext(appId, context);
        
        // Return the first (latest) matching release, or null if none found
        return { data: availableReleases.length > 0 ? availableReleases[0] : null };
    } catch (error) {
        console.error("Failed to evaluate context:", error);
        return { error: "An unexpected error occurred during evaluation." };
    }
}

export async function evaluateRelease(appId: string, releaseId: string, context: EvaluationContext): Promise<{data?: {release: Release, isAvailable: boolean, availableRelease: Release | null}, error?: string}> {
    try {
        const release = await db.getRelease(appId, releaseId);
        if (!release) {
            return { error: "Release not found." };
        }
        
        // Get the release that would actually be available for this context
        const availableReleases = await db.getAvailableReleasesForContext(appId, context);
        const availableRelease = availableReleases.length > 0 ? availableReleases[0] : null;
        
        // Check if the specific release being evaluated is available
        const isAvailable = release.status === ReleaseStatus.ACTIVE && availableReleases.some(r => r.id === releaseId);
        
        return { data: { release, isAvailable, availableRelease } };
    } catch (error) {
        console.error("Failed to evaluate release:", error);
        return { error: "An unexpected error occurred during evaluation." };
    }
}
