
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient, Client } from "@libsql/client";
import * as schema from './schema';
import { DataService } from ".";
import { Application } from "@/types/application";
import { UserProfile } from "@/types/user-profile";
import { Role } from "@/types/roles";
import { Release, ReleaseStatus } from "@/types/release";
import { Condition } from "@/types/condition";
import { randomUUID } from "crypto";
import { and, count, desc, eq, inArray, or, like, sql } from 'drizzle-orm';

export class DrizzleDataService implements DataService {
  private client: Client;
  private db: LibSQLDatabase<typeof schema>;

  constructor() {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        throw new Error("Turso database URL and auth token are required.");
    }
    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    this.db = drizzle(this.client, { schema });
  }

  // Helper to get user emails for an application
  private async getAppUserEmails(appId: string): Promise<string[]> {
      const users = await this.db.select({ email: schema.users.email })
          .from(schema.users)
          .innerJoin(schema.applicationUsers, eq(schema.users.uid, schema.applicationUsers.userId))
          .where(eq(schema.applicationUsers.applicationId, appId));

      return users.map(u => u.email).filter((e): e is string => e !== null);
  }

  private async getUsersFromEmails(emails: string[]): Promise<UserProfile[]> {
      if (emails.length === 0) return [];
      const users = await this.db.query.users.findMany({
          where: inArray(schema.users.email, emails)
      });
      return users.map(u => ({
          ...u,
          displayName: u.displayName,
          photoURL: u.photoUrl,
      }));
  }

  async createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application> {
    const id = randomUUID();
    const createdAt = new Date();
    
    const userProfiles = await this.getUsersFromEmails(appData.users);
    const userIds = userProfiles.map(u => u.uid);

    await this.db.transaction(async (tx) => {
        await tx.insert(schema.applications).values({
            id,
            name: appData.name,
            packageName: appData.packageName,
            ownerId: appData.ownerId,
            createdAt,
        });

        if (userIds.length > 0) {
            await tx.insert(schema.applicationUsers).values(
                userIds.map(userId => ({
                    applicationId: id,
                    userId: userId,
                }))
            );
        }
    });

    return { ...appData, id, createdAt };
  }

  async getApp(id: string): Promise<Application | null> {
    const app = await this.db.query.applications.findFirst({
        where: eq(schema.applications.id, id)
    });
    if (!app) return null;

    const users = await this.getAppUserEmails(id);

    return {
        id: app.id,
        name: app.name,
        packageName: app.packageName,
        ownerId: app.ownerId,
        createdAt: app.createdAt,
        users,
    };
  }

  async getAppsForUser(userId: string): Promise<Application[]> {
    const userWithApps = await this.db.query.users.findFirst({
        where: eq(schema.users.uid, userId),
        with: {
            applications: {
                with: {
                    application: true
                }
            }
        },
    });

    if (!userWithApps || !userWithApps.applications) {
        return [];
    }

    const appsData = userWithApps.applications.map(a => a.application).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result: Application[] = [];
    for (const app of appsData) {
        const users = await this.getAppUserEmails(app.id);
        result.push({ ...app, users });
    }
    return result;
  }

  async updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application> {
    await this.db.transaction(async (tx) => {
        if (updates.name || updates.packageName) {
             await tx.update(schema.applications)
                .set({ name: updates.name, packageName: updates.packageName })
                .where(eq(schema.applications.id, id));
        }

        if (updates.users) {
            const userProfiles = await this.getUsersFromEmails(updates.users);
            const userIds = userProfiles.map(u => u.uid);

            await tx.delete(schema.applicationUsers)
                .where(eq(schema.applicationUsers.applicationId, id));
            
            if (userIds.length > 0) {
                await tx.insert(schema.applicationUsers).values(
                    userIds.map(userId => ({
                        applicationId: id,
                        userId: userId,
                    }))
                );
            }
        }
    });
    
    const updatedApp = await this.getApp(id);
    if (!updatedApp) throw new Error("Failed to find app after update");
    return updatedApp;
  }
  
  async deleteApp(id: string): Promise<void> {
    await this.db.delete(schema.applications).where(eq(schema.applications.id, id));
  }

  async findOrCreateUser(userData: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile> {
    if (!userData.email) {
      throw new Error("User email cannot be null.");
    }
    
    const existingUser = await this.db.query.users.findFirst({
        where: eq(schema.users.uid, userData.uid),
    });

    if (existingUser) {
        return {
            ...existingUser,
            displayName: existingUser.displayName,
            photoURL: existingUser.photoUrl,
        };
    }

    const [userCount] = await this.db.select({ count: count() }).from(schema.users);
    const isFirstUser = userCount.count === 0;
    const role = isFirstUser ? Role.SUPERADMIN : Role.USER;
    const createdAt = new Date();

    const newUser: Omit<UserProfile, 'displayName' | 'photoURL'> & { displayName: string | null, photoUrl: string | null } = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || null,
        photoUrl: userData.photoURL || null,
        role,
        createdAt
    };

    await this.db.insert(schema.users).values(newUser);

    return {
        ...newUser,
        displayName: newUser.displayName,
        photoURL: newUser.photoUrl,
    };
  }
  
  async getSuperAdminsForApp(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];
    const superAdmins = await this.db.query.users.findMany({
        where: and(
            inArray(schema.users.uid, userIds),
            eq(schema.users.role, Role.SUPERADMIN)
        )
    });

    return superAdmins.map(u => ({
        ...u,
        displayName: u.displayName,
        photoURL: u.photoUrl,
    }));
  }

  async createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release> {
      const id = randomUUID();
      const createdAt = new Date();
      const { conditionIds, ...restData } = releaseData;

      await this.db.transaction(async (tx) => {
          await tx.insert(schema.releases).values({
              id,
              applicationId: appId,
              createdAt,
              ...restData,
          });

          if(conditionIds && conditionIds.length > 0) {
              await tx.insert(schema.releaseConditions).values(
                  conditionIds.map(conditionId => ({
                      releaseId: id,
                      conditionId,
                  }))
              );
          }
      });
      
      return { id, applicationId: appId, createdAt, ...releaseData };
  }

  async getRelease(appId: string, releaseId: string): Promise<Release | null> {
      const release = await this.db.query.releases.findFirst({
          where: and(
              eq(schema.releases.id, releaseId),
              eq(schema.releases.applicationId, appId)
          ),
          with: {
              releaseConditions: {
                  columns: {
                      conditionId: true
                  }
              }
          }
      });
      if (!release) return null;
      
      return {
          ...release,
          conditionIds: release.releaseConditions.map(rc => rc.conditionId),
      };
  }

  async getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }> {
      const [totalResult] = await this.db.select({ count: count() })
          .from(schema.releases)
          .where(eq(schema.releases.applicationId, appId));

      const offset = (page - 1) * limit;

      const releasesData = await this.db.query.releases.findMany({
          where: eq(schema.releases.applicationId, appId),
          orderBy: desc(schema.releases.createdAt),
          limit,
          offset,
          with: {
            releaseConditions: {
                columns: {
                    conditionId: true
                }
            }
          }
      });

      const releases = releasesData.map(r => ({
          ...r,
          conditionIds: r.releaseConditions.map(rc => rc.conditionId),
      }));

      return { releases, total: totalResult.count };
  }
  
  async getActiveReleasesForApp(appId: string): Promise<{ releases: Release[]; total: number; }> {
      const releasesData = await this.db.query.releases.findMany({
          where: and(
            eq(schema.releases.applicationId, appId),
            eq(schema.releases.status, ReleaseStatus.ACTIVE)
          ),
          orderBy: desc(schema.releases.createdAt),
          with: {
              releaseConditions: {
                  columns: {
                      conditionId: true
                  }
              }
          }
      });
      
      const releases = releasesData.map(r => ({
          ...r,
          conditionIds: r.releaseConditions.map(rc => rc.conditionId),
      }));
      
      return { releases, total: releases.length };
  }

  async getAvailableReleasesForContext(appId: string, context: { country: string; companyId: number; driverId: string; vehicleId: string }): Promise<Release[]> {
      // Use a performant SQL query with the normalized schema to find releases that match the context
      // This implements the logic: A release is available if all its conditions match the context
      
      const query = `
        SELECT DISTINCT r.id, r.application_id, r.version_name, r.version_code, r.status, r.created_at
        FROM releases r
        LEFT JOIN release_conditions rc ON r.id = rc.release_id
        LEFT JOIN conditions c ON rc.condition_id = c.id
        WHERE r.application_id = ? AND r.status = ?
          AND (c.countries IS NULL OR c.countries = '[]' OR json_array_length(c.countries) = 0 OR json_extract(c.countries, '$') LIKE '%"' || ? || '"%')
          AND (c.companies IS NULL OR c.companies = '[]' OR json_array_length(c.companies) = 0 OR json_extract(c.companies, '$') LIKE '%' || ? || '%')
          AND  (c.drivers IS NULL OR c.drivers = '[]' OR json_array_length(c.drivers) = 0 OR json_extract(c.drivers, '$') LIKE '%"' || ? || '"%')
          AND (c.vehicles IS NULL OR c.vehicles = '[]' OR json_array_length(c.vehicles) = 0 OR json_extract(c.vehicles, '$') LIKE '%"' || ? || '"%')
        ORDER BY r.version_code DESC
        LIMIT 1
      `;

      const params = [
        appId, ReleaseStatus.ACTIVE,
        context.country,  // Country param
        context.companyId,  // Company param  
        context.driverId,  // Driver param
        context.vehicleId   // Vehicle param
      ];

      // Fill parameters into query for debugging
      let filledQuery = query;
      params.forEach((param) => {
        const value = typeof param === 'string' ? `'${param}'` : param;
        filledQuery = filledQuery.replace('?', String(value));
      });

      console.log('🔍 getAvailableReleasesForContext Query:', {
        database: process.env.TURSO_DATABASE_URL,
        query: filledQuery
      });

      // Execute with replicationSync to ensure fresh data from primary
      const results = await this.client.execute({
        sql: query,
        args: params,
      });
      
      console.log('📊 getAvailableReleasesForContext Results:', {
        rowCount: results.rows.length,
        rawRows: results.rows,
        columns: results.columns,
        executedQuery: filledQuery
      });
      
      // Convert results to Release objects
      const releases: Release[] = [];
      for (const row of results.rows) {
        // Results come as objects with named properties
        const rowObj = row as any;
        const releaseId = rowObj.id;
        
        // Get condition IDs for this release
        const conditionResult = await this.db.select({ conditionId: schema.releaseConditions.conditionId })
          .from(schema.releaseConditions)
          .where(eq(schema.releaseConditions.releaseId, releaseId));
        
        releases.push({
          id: releaseId,
          applicationId: rowObj.application_id,
          versionName: rowObj.version_name,
          versionCode: rowObj.version_code,
          status: rowObj.status as ReleaseStatus,
          createdAt: new Date(rowObj.created_at * 1000), // Convert Unix timestamp to Date
          conditionIds: conditionResult.map(cr => cr.conditionId),
        });
      }
      
      return releases;
  }

  async updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release> {
      const { conditionIds, ...releaseUpdates } = updates;

      await this.db.transaction(async (tx) => {
          if (Object.keys(releaseUpdates).length > 0) {
              await tx.update(schema.releases)
                  .set(releaseUpdates)
                  .where(and(eq(schema.releases.id, releaseId), eq(schema.releases.applicationId, appId)));
          }

          if (conditionIds !== undefined) {
              await tx.delete(schema.releaseConditions)
                  .where(eq(schema.releaseConditions.releaseId, releaseId));

              if (conditionIds.length > 0) {
                  await tx.insert(schema.releaseConditions).values(
                      conditionIds.map(conditionId => ({
                          releaseId: releaseId,
                          conditionId,
                      }))
                  );
              }
          }
      });
      
      const release = await this.getRelease(appId, releaseId);
      if (!release) throw new Error("Failed to get release after update");
      return release;
  }
  
  async deleteRelease(appId: string, releaseId: string): Promise<void> {
      await this.db.delete(schema.releases)
        .where(and(eq(schema.releases.id, releaseId), eq(schema.releases.applicationId, appId)));
  }
  
  private rowToCondition(row: schema.Condition): Condition {
      return {
          id: row.id,
          applicationId: row.applicationId,
          name: row.name,
          countries: row.countries || [],
          companies: row.companies || [],
          drivers: row.drivers || [],
          vehicles: row.vehicles || [],
          createdAt: row.createdAt,
      };
  }

  async createCondition(appId: string, conditionData: Omit<Condition, "id" | "createdAt" | "applicationId">): Promise<Condition> {
      const id = randomUUID();
      const createdAt = new Date();
      
      await this.db.insert(schema.conditions).values({
          id,
          applicationId: appId,
          name: conditionData.name,
          countries: conditionData.countries || [],
          companies: conditionData.companies || [],
          drivers: conditionData.drivers || [],
          vehicles: conditionData.vehicles || [],
          createdAt,
      });
      
      return { id, applicationId: appId, createdAt, ...conditionData };
  }

  async getCondition(appId: string, conditionId: string): Promise<Condition | null> {
      const condition = await this.db.query.conditions.findFirst({
        where: and(
            eq(schema.conditions.id, conditionId), 
            eq(schema.conditions.applicationId, appId)
        )
      });
      if (!condition) return null;
      return this.rowToCondition(condition);
  }

  async getConditionsForApp(appId: string): Promise<Condition[]> {
      const conditions = await this.db.query.conditions.findMany({
          where: eq(schema.conditions.applicationId, appId),
          orderBy: desc(schema.conditions.createdAt)
      });
      return conditions.map(c => this.rowToCondition(c));
  }

  async updateCondition(appId: string, conditionId: string, updates: Partial<Omit<Condition, "id" | "createdAt" | "applicationId">>): Promise<Condition> {
      const existing = await this.getCondition(appId, conditionId);
      if(!existing) throw new Error("Condition not found");

      const updateData = {
          name: updates.name ?? existing.name,
          countries: updates.countries ?? existing.countries,
          companies: updates.companies ?? existing.companies,
          drivers: updates.drivers ?? existing.drivers,
          vehicles: updates.vehicles ?? existing.vehicles,
      };

      await this.db.update(schema.conditions)
          .set(updateData)
          .where(and(eq(schema.conditions.id, conditionId), eq(schema.conditions.applicationId, appId)));

      const condition = await this.getCondition(appId, conditionId);
      if (!condition) throw new Error("Could not find condition after update");
      return condition;
  }

  async deleteCondition(appId: string, conditionId: string): Promise<void> {
      await this.db.delete(schema.conditions)
        .where(and(eq(schema.conditions.id, conditionId), eq(schema.conditions.applicationId, appId)));
  }
}
