
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Condition, conditionSchema } from "@/types/condition";

type ConditionInput = Omit<Condition, "id" | "createdAt" | "applicationId">;

export async function createCondition(appId: string, values: ConditionInput): Promise<{ data?: Condition, error?: string }> {
  const validatedFields = conditionSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }

  try {
    const newCondition = await db.createCondition(appId, validatedFields.data);
    revalidatePath(`/app/${appId}/conditions`);
    return { data: newCondition };
  } catch (error) {
    console.error("Failed to create condition:", error);
    return {
      error: "Failed to create condition.",
    };
  }
}

export async function getCondition(appId: string, conditionId: string): Promise<Condition | null> {
    return await db.getCondition(appId, conditionId);
}

export async function getConditionsForApp(appId: string): Promise<Condition[]> {
    return await db.getConditionsForApp(appId);
}

export async function updateCondition(appId: string, conditionId: string, values: ConditionInput): Promise<{ data?: Condition, error?: string }> {
    const validatedFields = conditionSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    try {
        const updatedCondition = await db.updateCondition(appId, conditionId, validatedFields.data);
        revalidatePath(`/app/${appId}/conditions`);
        revalidatePath(`/app/${appId}/conditions/${conditionId}/edit`);
        return { data: updatedCondition };
    } catch (error) {
        console.error("Failed to update condition:", error);
        return { error: "Failed to update condition." };
    }
}

export async function deleteCondition(appId: string, conditionId: string): Promise<{ success?: boolean, error?: string }> {
    try {
        await db.deleteCondition(appId, conditionId);
        revalidatePath(`/app/${appId}/conditions`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete condition:", error);
        return { error: "Failed to delete condition." };
    }
}
