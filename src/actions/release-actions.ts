
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Release } from "@/types/release";

const formSchema = z.object({
  versionName: z.string().min(1, {
    message: "Version name is required.",
  }),
  versionCode: z.string().min(1, {
    message: "Version code is required.",
  }),
});

export async function createRelease(appId: string, values: z.infer<typeof formSchema>): Promise<{ data?: Release, error?: string }> {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }

  const { versionName, versionCode } = validatedFields.data;

  try {
    const newRelease = await db.createRelease(appId, {
      versionName,
      versionCode,
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

export async function getReleasesForApp(appId: string): Promise<Release[]> {
    return await db.getReleasesForApp(appId);
}
