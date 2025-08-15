
import { Application } from "@/types/application";
import { Release } from "@/types/release";
import { UserProfile } from "@/types/user-profile";
import { FirestoreDataService } from "./firestore";

export interface DataService {
  createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application>;
  getApp(id: string): Promise<Application | null>;
  getAppsForUser(userEmail: string): Promise<Application[]>;
  updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application>;
  deleteApp(id: string): Promise<void>;
  findOrCreateUser(user: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile>;
  getSuperAdminsForApp(userEmails: string[]): Promise<UserProfile[]>;

  createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release>;
  getReleasesForApp(appId: string): Promise<Release[]>;
  updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release>;
  deleteRelease(appId: string, releaseId: string): Promise<void>;
}

// For now, we are hardcoding the Firestore implementation.
// In the future, we can use an environment variable to switch between implementations.
export const db: DataService = new FirestoreDataService();
