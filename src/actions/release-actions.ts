
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
  versionCode: z.string().min(1, {
    message: "Version code is required.",
  }),
  status: z.nativeEnum(ReleaseStatus),
  conditionIds: z.array(z.string()).default([]),
});

const evaluationContextSchema = z.object({
    country: z.string().optional(),
    companyId: z.number().optional(),
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
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

function isReleaseAvailableForContext(release: Release, context: EvaluationContext, allConditions: Condition[]): boolean {
    if (release.conditionIds.length === 0) {
        return true;
    }

    const releaseConditions = allConditions.filter(c => release.conditionIds.includes(c.id));

    if (releaseConditions.length !== release.conditionIds.length) {
        // A condition associated with the release was not found, treat as unavailable
        return false;
    }
    
    // Check if the context matches ALL conditions associated with the release
    return releaseConditions.every(condition => {
        const { rules } = condition;
        const countryMatch = rules.countries.length === 0 || (context.country ? rules.countries.includes(context.country) : false);
        const companyMatch = rules.companyIds.length === 0 || (context.companyId ? rules.companyIds.includes(context.companyId) : false);

        const driverRuleMatch = rules.driverIds.length === 0 || (context.driverId ? rules.driverIds.includes(context.driverId) : false);
        const vehicleRuleMatch = rules.vehicleIds.length === 0 || (context.vehicleId ? rules.vehicleIds.includes(context.vehicleId) : false);
        
        // Since driver and vehicle rules are mutually exclusive within a condition, this simplifies to checking if either rule set passes.
        // If one is defined, the other is empty, so it will pass. If both are empty, it passes.
        const driverOrVehicleMatch = driverRuleMatch || vehicleRuleMatch;
        
        return countryMatch && companyMatch && driverOrVehicleMatch;
    });
}

export async function evaluateContext(appId: string, context: EvaluationContext): Promise<{data?: Release | null, error?: string}> {
    try {
        const { releases } = await db.getActiveReleasesForApp(appId);
        const allConditions = await db.getConditionsForApp(appId);

        for (const release of releases) {
            if (isReleaseAvailableForContext(release, context, allConditions)) {
                return { data: release }; // Return the first (latest) matching release
            }
        }
        return { data: null }; // No matching release found
    } catch (error) {
        console.error("Failed to evaluate context:", error);
        return { error: "An unexpected error occurred during evaluation." };
    }
}

export async function evaluateRelease(appId: string, releaseId: string, context: EvaluationContext): Promise<{data?: boolean, error?: string}> {
    try {
        const release = await db.getRelease(appId, releaseId);
        if (!release || release.status !== ReleaseStatus.ACTIVE) {
            return { data: false, error: "Release not found or is not active." };
        }
        const allConditions = await db.getConditionsForApp(appId);
        const isAvailable = isReleaseAvailableForContext(release, context, allConditions);
        return { data: isAvailable };
    } catch (error) {
        console.error("Failed to evaluate release:", error);
        return { error: "An unexpected error occurred during evaluation." };
    }
}
