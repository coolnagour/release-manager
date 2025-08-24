
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema-pg';
import { DataService } from ".";
import { Application, ApplicationUser } from "@/types/application";
import { UserProfile } from "@/types/user-profile";
import { Role } from "@/types/roles";
import { Release, ReleaseStatus } from "@/types/release";
import { Condition } from "@/types/condition";
import { randomUUID } from "crypto";
import { and, count, desc, eq, inArray, sql, Param } from 'drizzle-orm';
import { ReleaseCheckLog } from '@/types/release-check-log';

export class SupabaseDataService implements DataService {
  private client: postgres.Sql<{}>;
  private db: PostgresJsDatabase<typeof schema>;

  constructor() {
    if (!process.env.SUPABASE_DATABASE_URL) {
        throw new Error("Supabase database URL is required.");
    }
    
    this.client = postgres(process.env.SUPABASE_DATABASE_URL, {
      prepare: false
    });
    
    this.db = drizzle(this.client, { 
      schema: schema.pgSchema,
      logger: process.env.NODE_ENV === 'development' ? {
        logQuery: (query, params) => {
          console.log('🔍 Supabase SQL Query:', query);
          if (params.length > 0) console.log('📋 Parameters:', params);
        }
      } : undefined
    });
  }

  private async getAppUsers(appId: string): Promise<ApplicationUser[]> {
      const appUserRoles = await this.db.select({ 
          email: schema.users.email,
          role: schema.applicationUsers.role
        })
          .from(schema.users)
          .innerJoin(schema.applicationUsers, eq(schema.users.uid, schema.applicationUsers.userId))
          .where(eq(schema.applicationUsers.applicationId, appId));

      return appUserRoles
        .filter(u => u.email)
        .map(u => ({ email: u.email!, role: u.role }));
  }

  async createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application> {
    const id = randomUUID();
    const createdAt = new Date();
    
    await this.db.transaction(async (tx) => {
        await tx.insert(schema.applications).values({
            id,
            name: appData.name,
            packageName: appData.packageName,
            ownerId: appData.ownerId,
            createdAt,
        });
        
        for (const user of appData.users) {
            let dbUser = await tx.query.users.findFirst({ where: eq(schema.users.email, user.email) });
            if (!dbUser) {
                // Create a placeholder user
                const newUserId = randomUUID();
                await tx.insert(schema.users).values({
                    uid: newUserId,
                    email: user.email,
                    isSuperAdmin: false,
                    createdAt: new Date(),
                });
                dbUser = { uid: newUserId, email: user.email, displayName: null, photoUrl: null, isSuperAdmin: false, createdAt: new Date() };
            }
            await tx.insert(schema.applicationUsers).values({
                applicationId: id,
                userId: dbUser.uid,
                role: user.role,
            });
        }
    });

    return { ...appData, id, createdAt };
  }

  async getApp(id: string): Promise<Application | null> {
    const app = await this.db.query.applications.findFirst({
        where: eq(schema.applications.id, id)
    });
    if (!app) return null;

    const users = await this.getAppUsers(id);

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
        const users = await this.getAppUsers(app.id);
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
            await tx.delete(schema.applicationUsers).where(eq(schema.applicationUsers.applicationId, id));
            for (const user of updates.users) {
                let dbUser = await tx.query.users.findFirst({ where: eq(schema.users.email, user.email) });
                if (!dbUser) {
                    const newUserId = randomUUID();
                    await tx.insert(schema.users).values({ uid: newUserId, email: user.email, isSuperAdmin: false, createdAt: new Date() });
                    dbUser = { uid: newUserId, email: user.email, displayName: null, photoUrl: null, isSuperAdmin: false, createdAt: new Date() };
                }
                await tx.insert(schema.applicationUsers).values({
                    applicationId: id,
                    userId: dbUser.uid,
                    role: user.role,
                });
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
  
  async getUser(uid: string): Promise<Omit<UserProfile, 'roles'> | null> {
    const user = await this.db.query.users.findFirst({
        where: eq(schema.users.uid, uid)
    });
    if (!user) return null;
    return {
        ...user,
        displayName: user.displayName,
        photoURL: user.photoUrl,
    };
  }

  async createUser(userData: { email: string; isSuperAdmin: boolean; }): Promise<UserProfile> {
      const existingUser = await this.db.query.users.findFirst({
          where: eq(schema.users.email, userData.email),
      });

      if (existingUser) {
          throw new Error("A user with this email already exists.");
      }

      const newUser = {
          uid: randomUUID(),
          email: userData.email,
          displayName: null,
          photoUrl: null,
          isSuperAdmin: userData.isSuperAdmin,
          createdAt: new Date(),
      };
      
      await this.db.insert(schema.users).values(newUser);

      return {
          ...newUser,
          roles: {}, // No app roles initially
      };
  }

  async findOrCreateUser(userData: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile | null> {
    if (!userData.email) {
      throw new Error("User email cannot be null.");
    }
    
    let existingUser = await this.db.query.users.findFirst({
        where: eq(schema.users.email, userData.email),
    });

    if (!existingUser) {
        const [userCountResult] = await this.db.select({ count: count() }).from(schema.users);
        const isFirstUser = userCountResult.count === 0;

        // If not first user, check if they are part of any application
        if (!isFirstUser) {
             const appUser = await this.db.query.applicationUsers.findFirst({
                where: eq(schema.applicationUsers.userId, userData.uid)
            });
            if (!appUser) {
                // If user is not associated with any app, do not create them
                 console.warn(`Login blocked for ${userData.email} - not associated with any application.`);
                return null;
            }
        }
        
        const newUser = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName || null,
            photoUrl: userData.photoURL || null,
            isSuperAdmin: isFirstUser,
            createdAt: new Date(),
        };
        await this.db.insert(schema.users).values(newUser);
        existingUser = newUser;

    } else {
        await this.db.update(schema.users).set({
            uid: userData.uid, // This allows linking a pre-created user to a Firebase Auth user on first login
            displayName: userData.displayName,
            photoUrl: userData.photoURL,
        }).where(eq(schema.users.email, userData.email));

        existingUser = {
            ...existingUser,
            uid: userData.uid,
            displayName: userData.displayName,
            photoUrl: userData.photoURL,
        }
    }


    const userRoles = await this.db.query.applicationUsers.findMany({
        where: eq(schema.applicationUsers.userId, userData.uid)
    });

    const rolesMap: { [appId: string]: Role } = {};
    userRoles.forEach(ur => {
        rolesMap[ur.applicationId] = ur.role;
    });

    return {
        uid: existingUser.uid,
        email: existingUser.email,
        displayName: existingUser.displayName,
        photoURL: existingUser.photoUrl,
        isSuperAdmin: existingUser.isSuperAdmin,
        roles: rolesMap,
        createdAt: existingUser.createdAt,
    };
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
              status: restData.status
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
          status: release.status as ReleaseStatus,
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
          status: r.status as ReleaseStatus,
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
          status: r.status as ReleaseStatus,
          conditionIds: r.releaseConditions.map(rc => rc.conditionId),
      }));
      
      return { releases, total: releases.length };
  }

  async getAvailableReleasesForContext(appId: string, context: { country: string; companyId: number; driverId: string; vehicleId: string }): Promise<Release[]> {
      const query = sql`
        SELECT DISTINCT r.id, r.application_id, r.version_name, r.version_code, r.status, r.created_at
        FROM ${schema.releases} r
        LEFT JOIN ${schema.releaseConditions} rc ON r.id = rc.release_id
        LEFT JOIN ${schema.conditions} c ON rc.condition_id = c.id
        WHERE r.application_id = ${appId} AND r.status = ${ReleaseStatus.ACTIVE}
          AND (c.countries IS NULL OR jsonb_array_length(c.countries) = 0 OR c.countries ? ${context.country})
          AND (c.companies IS NULL OR jsonb_array_length(c.companies) = 0 OR c.companies @> ${context.companyId}::jsonb)
          AND (c.drivers IS NULL OR jsonb_array_length(c.drivers) = 0 OR c.drivers ? ${context.driverId})
          AND (c.vehicles IS NULL OR jsonb_array_length(c.vehicles) = 0 OR c.vehicles ? ${context.vehicleId})
        ORDER BY r.version_code DESC
      `;

      const results = await this.db.execute(query);
      
      const releases: Release[] = [];
      for (const row of results) {
        const releaseId = row.id as string;
        
        const conditionResult = await this.db.select({ conditionId: schema.releaseConditions.conditionId })
          .from(schema.releaseConditions)
          .where(eq(schema.releaseConditions.releaseId, releaseId));
        
        releases.push({
          id: releaseId,
          applicationId: row.application_id as string,
          versionName: row.version_name as string,
          versionCode: row.version_code as number,
          status: row.status as ReleaseStatus,
          createdAt: new Date(row.created_at as string),
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
                  .set({...releaseUpdates, status: releaseUpdates.status})
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
  
  private rowToCondition(row: any): Condition {
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
      
      const [newCondition] = await this.db.insert(schema.conditions).values({
          id,
          applicationId: appId,
          name: conditionData.name,
          countries: conditionData.countries || [],
          companies: conditionData.companies || [],
          drivers: conditionData.drivers || [],
          vehicles: conditionData.vehicles || [],
          createdAt,
      }).returning();
      
      return this.rowToCondition(newCondition);
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
      const [updatedCondition] = await this.db.update(schema.conditions)
          .set({
              name: updates.name,
              countries: updates.countries,
              companies: updates.companies,
              drivers: updates.drivers,
              vehicles: updates.vehicles,
          })
          .where(and(eq(schema.conditions.id, conditionId), eq(schema.conditions.applicationId, appId)))
          .returning();

      if (!updatedCondition) throw new Error("Could not find condition after update");
      return this.rowToCondition(updatedCondition);
  }

  async deleteCondition(appId: string, conditionId: string): Promise<void> {
      await this.db.delete(schema.conditions)
        .where(and(eq(schema.conditions.id, conditionId), eq(schema.conditions.applicationId, appId)));
  }

  async logReleaseCheck(logData: Omit<ReleaseCheckLog, "id" | "createdAt">): Promise<void> {
    await this.db.insert(schema.releaseCheckLogs).values({
      id: randomUUID(),
      createdAt: new Date(),
      ...logData,
    });
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
