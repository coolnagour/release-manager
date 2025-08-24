
import { Application } from "@/types/application";
import { Release } from "@/types/release";
import { UserProfile } from "@/types/user-profile";
import { Condition } from "@/types/condition";
import { TursoDataService } from "./turso";
import { SupabaseDataService } from "./supabase";
import { Role } from "@/types/roles";
import { DriverActivityLog } from "@/types/driver";

export interface DataService {
  createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application>;
  getApp(id: string): Promise<Application | null>;
  getAppsForUser(userId: string): Promise<Application[]>;
  updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application>;
  deleteApp(id: string): Promise<void>;
  
  findOrCreateUser(userData: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile | null>;
  getUser(uid: string): Promise<Omit<UserProfile, 'roles'> | null>;
  createUser(userData: { email: string; isSuperAdmin: boolean }): Promise<UserProfile>;

  createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release>;
  getRelease(appId: string, releaseId: string): Promise<Release | null>;
  getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }>;
  getActiveReleasesForApp(appId: string): Promise<{ releases: Release[], total: number }>;
  getAvailableReleasesForContext(appId: string, context: { country?: string; companyId?: number; driverId?: string; vehicleId?: string }): Promise<Release[]>;
  updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release>;
  deleteRelease(appId: string, releaseId: string): Promise<void>;

  createCondition(appId: string, conditionData: Omit<Condition, "id" | "createdAt" | "applicationId">): Promise<Condition>;
  getCondition(appId: string, conditionId: string): Promise<Condition | null>;
  getConditionsForApp(appId: string): Promise<Condition[]>;
  updateCondition(appId: string, conditionId: string, updates: Partial<Omit<Condition, "id" | "createdAt" | "applicationId">>): Promise<Condition>;
  deleteCondition(appId: string, conditionId: string): Promise<void>;
  
  logDriverActivity(logData: Omit<DriverActivityLog, "id" | "createdAt">): Promise<void>;
}

type DatabaseProvider = 'turso' | 'supabase';

function getDbProvider(): DatabaseProvider {
  const provider = process.env.DATABASE_PROVIDER || 'turso';
  
  if (provider !== 'turso' && provider !== 'supabase') {
    console.warn(`Invalid DATABASE_PROVIDER: ${provider}. Defaulting to 'turso'.`);
    return 'turso';
  }
  
  return provider as DatabaseProvider;
}

function initializeDb(): DataService {
  const provider = getDbProvider();
  
  console.log(`🗄️  Initializing database with provider: ${provider}`);
  
  switch (provider) {
    case 'supabase':
      return new SupabaseDataService();
    case 'turso':
    default:
      return new TursoDataService();
  }
}

export const db: DataService = initializeDb();
