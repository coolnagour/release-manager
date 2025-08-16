
import { Application } from "@/types/application";
import { Release } from "@/types/release";
import { UserProfile } from "@/types/user-profile";
import { FirestoreDataService } from "./firestore";
import { Condition } from "@/types/condition";

export interface DataService {
  createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application>;
  getApp(id: string): Promise<Application | null>;
  getAppsForUser(userEmail: string): Promise<Application[]>;
  updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application>;
  deleteApp(id: string): Promise<void>;
  findOrCreateUser(user: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile>;
  getSuperAdminsForApp(userEmails: string[]): Promise<UserProfile[]>;

  createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release>;
  getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }>;
  updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release>;
  deleteRelease(appId: string, releaseId: string): Promise<void>;

  createCondition(appId: string, conditionData: Omit<Condition, "id" | "createdAt" | "applicationId">): Promise<Condition>;
  getCondition(appId: string, conditionId: string): Promise<Condition | null>;
  getConditionsForApp(appId: string): Promise<Condition[]>;
  updateCondition(appId: string, conditionId: string, updates: Partial<Omit<Condition, "id" | "createdAt" | "applicationId">>): Promise<Condition>;
  deleteCondition(appId: string, conditionId: string): Promise<void>;
}

// For now, we are hardcoding the Firestore implementation.
// In the future, we can use an environment variable to switch between implementations.
export const db: DataService = new FirestoreDataService();
