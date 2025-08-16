
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
    
    // The context must match the combined rules of ALL associated conditions.
    // We can merge all rules into a single set for evaluation.
    const combinedRules = {
      countries: [...new Set(releaseConditions.flatMap(c => c.rules.countries))],
      companyIds: [...new Set(releaseConditions.flatMap(c => c.rules.companyIds))],
      driverIds: [...new Set(releaseConditions.flatMap(c => c.rules.driverIds))],
      vehicleIds: [...new Set(releaseConditions.flatMap(c => c.rules.vehicleIds))],
    };
    
    const countryMatch = combinedRules.countries.length === 0 || (context.country ? combinedRules.countries.includes(context.country) : false);
    const companyMatch = combinedRules.companyIds.length === 0 || (context.companyId ? combinedRules.companyIds.includes(context.companyId) : false);
    
    // For driver/vehicle, the release is available if EITHER a driver rule OR a vehicle rule matches the context.
    const driverMatch = combinedRules.driverIds.length === 0 || (context.driverId ? combinedRules.driverIds.includes(context.driverId) : false);
    const vehicleMatch = combinedRules.vehicleIds.length === 0 || (context.vehicleId ? combinedRules.vehicleIds.includes(context.vehicleId) : false);

    // If both driver and vehicle rules exist (from different conditions), we check if context matches either.
    // If only one type of rule exists, the other is effectively "pass-through".
    // If no driver or vehicle rules exist, it's a "pass-through".
    const driverOrVehicleMatch = (combinedRules.driverIds.length > 0 || combinedRules.vehicleIds.length > 0)
      ? (driverMatch && combinedRules.driverIds.length > 0) || (vehicleMatch && combinedRules.vehicleIds.length > 0)
      : true;


    // A special case: if both driver and vehicle rules are specified across all conditions,
    // we need to be careful. The logic should be (driver rules pass) OR (vehicle rules pass).
    // Let's refine the logic for driver/vehicle.
    const hasDriverRules = combinedRules.driverIds.length > 0;
    const hasVehicleRules = combinedRules.vehicleIds.length > 0;

    let driverVehicleRuleResult = true; // Default to true if no rules specified.

    if (hasDriverRules && hasVehicleRules) {
        // If rules for both exist across different conditions, context must match one of them.
        driverVehicleRuleResult = (context.driverId ? combinedRules.driverIds.includes(context.driverId) : false) || (context.vehicleId ? combinedRules.vehicleIds.includes(context.vehicleId) : false);
    } else if (hasDriverRules) {
        // Only driver rules specified.
        driverVehicleRuleResult = context.driverId ? combinedRules.driverIds.includes(context.driverId) : false;
    } else if (hasVehicleRules) {
        // Only vehicle rules specified.
        driverVehicleRuleResult = context.vehicleId ? combinedRules.vehicleIds.includes(context.vehicleId) : false;
    }

    return countryMatch && companyMatch && driverVehicleRuleResult;
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
