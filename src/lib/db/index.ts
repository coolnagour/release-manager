
import { Application } from "@/types/application";
import { Release } from "@/types/release";
import { UserProfile } from "@/types/user-profile";
import { Condition } from "@/types/condition";
import { DrizzleDataService } from "./drizzle";

export interface DataService {
  createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application>;
  getApp(id: string): Promise<Application | null>;
  getAppsForUser(userId: string): Promise<Application[]>;
  updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application>;
  deleteApp(id: string): Promise<void>;
  findOrCreateUser(user: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile>;
  getSuperAdminsForApp(userIds: string[]): Promise<UserProfile[]>;

  createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release>;
  getRelease(appId: string, releaseId: string): Promise<Release | null>;
  getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }>;
  getActiveReleasesForApp(appId: string): Promise<{ releases: Release[], total: number }>;
  updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release>;
  deleteRelease(appId: string, releaseId: string): Promise<void>;

  createCondition(appId: string, conditionData: Omit<Condition, "id" | "createdAt" | "applicationId">): Promise<Condition>;
  getCondition(appId: string, conditionId: string): Promise<Condition | null>;
  getConditionsForApp(appId: string): Promise<Condition[]>;
  updateCondition(appId: string, conditionId: string, updates: Partial<Omit<Condition, "id" | "createdAt" | "applicationId">>): Promise<Condition>;
  deleteCondition(appId: string, conditionId: string): Promise<void>;
}

function initializeDb(): DataService {
    return new DrizzleDataService();
}

export const db: DataService = initializeDb();
