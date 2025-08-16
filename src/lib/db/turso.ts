
import "server-only";

import { createClient, Client } from "@libsql/client";
import { DataService } from ".";
import { Application } from "@/types/application";
import { UserProfile } from "@/types/user-profile";
import { Role } from "@/types/roles";
import { Release, ReleaseStatus } from "@/types/release";
import { Condition } from "@/types/condition";
import { randomUUID } from "crypto";

export class TursoDataService implements DataService {
  private client: Client;

  constructor() {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        throw new Error("Turso database URL and auth token are required.");
    }
    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }

  // Helper to convert row to Application with users
  private async rowToApplication(row: any): Promise<Application> {
    const usersResult = await this.client.execute({
        sql: "SELECT user_email FROM application_users WHERE application_id = ?",
        args: [row.id]
    });
    const users = usersResult.rows.map((r: any) => r.user_email as string);
    return {
        id: row.id as string,
        name: row.name as string,
        packageName: row.package_name as string,
        ownerId: row.owner_id as string,
        createdAt: new Date(row.created_at as string),
        users: users,
    };
  }

  async createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application> {
    const id = randomUUID();
    const createdAt = new Date();
    
    await this.client.batch([
        {
            sql: "INSERT INTO applications (id, name, package_name, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            args: [id, appData.name, appData.packageName, appData.ownerId, createdAt.toISOString()]
        },
        ...appData.users.map(email => ({
            sql: "INSERT INTO application_users (application_id, user_email) VALUES (?, ?)",
            args: [id, email]
        }))
    ], "write");

    return { ...appData, id, createdAt };
  }

  async getApp(id: string): Promise<Application | null> {
    const result = await this.client.execute({
        sql: "SELECT * FROM applications WHERE id = ?",
        args: [id]
    });
    if (result.rows.length === 0) return null;
    return this.rowToApplication(result.rows[0]);
  }

  async getAppsForUser(userEmail: string): Promise<Application[]> {
     const result = await this.client.execute({
        sql: `SELECT a.* FROM applications a
              JOIN application_users au ON a.id = au.application_id
              WHERE au.user_email = ?
              ORDER BY a.created_at DESC`,
        args: [userEmail]
     });
     return Promise.all(result.rows.map(row => this.rowToApplication(row)));
  }

  async updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application> {
    const tx = await this.client.transaction("write");
    try {
        if (updates.name && updates.packageName) {
            await tx.execute({
                sql: "UPDATE applications SET name = ?, package_name = ? WHERE id = ?",
                args: [updates.name, updates.packageName, id]
            });
        }

        if (updates.users) {
            await tx.execute({
                sql: "DELETE FROM application_users WHERE application_id = ?",
                args: [id]
            });
            for (const email of updates.users) {
                await tx.execute({
                    sql: "INSERT INTO application_users (application_id, user_email) VALUES (?, ?)",
                    args: [id, email]
                });
            }
        }
        await tx.commit();
    } catch (e) {
        await tx.rollback();
        throw e;
    }
    const app = await this.getApp(id);
    if (!app) throw new Error("Failed to find app after update");
    return app;
  }
  
  async deleteApp(id: string): Promise<void> {
    await this.client.execute({
        sql: "DELETE FROM applications WHERE id = ?",
        args: [id]
    });
  }

  async findOrCreateUser(userData: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">): Promise<UserProfile> {
    const existingUser = await this.client.execute({
        sql: "SELECT * FROM users WHERE uid = ?",
        args: [userData.uid]
    });

    if (existingUser.rows.length > 0) {
        const u = existingUser.rows[0];
        return {
            uid: u.uid as string,
            email: u.email as string,
            displayName: u.display_name as string,
            photoURL: u.photo_url as string,
            role: u.role as Role,
            createdAt: new Date(u.created_at as string)
        };
    }

    const countResult = await this.client.execute("SELECT COUNT(*) as count FROM users");
    const isFirstUser = (countResult.rows[0].count as number) === 0;
    const role = isFirstUser ? Role.SUPERADMIN : Role.USER;
    const createdAt = new Date();

    const newUser: UserProfile = {
        ...userData,
        role,
        createdAt
    };

    await this.client.execute({
        sql: "INSERT INTO users (uid, email, display_name, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [newUser.uid, newUser.email, newUser.displayName, newUser.photoURL, newUser.role, newUser.createdAt.toISOString()]
    });

    return newUser;
  }
  
  async getSuperAdminsForApp(userEmails: string[]): Promise<UserProfile[]> {
    if (userEmails.length === 0) return [];
    const placeholders = userEmails.map(() => '?').join(',');
    const result = await this.client.execute({
        sql: `SELECT * FROM users WHERE email IN (${placeholders}) AND role = ?`,
        args: [...userEmails, Role.SUPERADMIN]
    });

    return result.rows.map(u => ({
        uid: u.uid as string,
        email: u.email as string,
        displayName: u.display_name as string,
        photoURL: u.photo_url as string,
        role: u.role as Role,
        createdAt: new Date(u.created_at as string)
    }));
  }

  private rowToRelease(row: any, conditionIds: string[]): Release {
    return {
        id: row.id as string,
        applicationId: row.application_id as string,
        versionName: row.version_name as string,
        versionCode: row.version_code as string,
        status: row.status as ReleaseStatus,
        createdAt: new Date(row.created_at as string),
        conditionIds: conditionIds
    };
  }

  async createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release> {
      const id = randomUUID();
      const createdAt = new Date();
      const { conditionIds, ...restData } = releaseData;

      const tx = await this.client.transaction("write");
      try {
          await tx.execute({
              sql: "INSERT INTO releases (id, application_id, version_name, version_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
              args: [id, appId, restData.versionName, restData.versionCode, restData.status, createdAt.toISOString()]
          });

          if(conditionIds) {
            for (const conditionId of conditionIds) {
                await tx.execute({
                    sql: "INSERT INTO release_conditions (release_id, condition_id) VALUES (?, ?)",
                    args: [id, conditionId]
                });
            }
          }
          await tx.commit();
      } catch(e) {
          await tx.rollback();
          throw e;
      }
      
      return { id, applicationId: appId, createdAt, ...releaseData };
  }

  async getRelease(appId: string, releaseId: string): Promise<Release | null> {
      const releaseResult = await this.client.execute({
          sql: "SELECT * FROM releases WHERE id = ? AND application_id = ?",
          args: [releaseId, appId]
      });
      if (releaseResult.rows.length === 0) return null;
      
      const conditionsResult = await this.client.execute({
          sql: "SELECT condition_id FROM release_conditions WHERE release_id = ?",
          args: [releaseId]
      });
      const conditionIds = conditionsResult.rows.map((r: any) => r.condition_id as string);

      return this.rowToRelease(releaseResult.rows[0], conditionIds);
  }

  async getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }> {
      const totalResult = await this.client.execute({
          sql: "SELECT COUNT(*) as count FROM releases WHERE application_id = ?",
          args: [appId]
      });
      const total = totalResult.rows[0].count as number;
      const offset = (page - 1) * limit;

      const releasesResult = await this.client.execute({
          sql: "SELECT * FROM releases WHERE application_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
          args: [appId, limit, offset]
      });

      const releases = await Promise.all(releasesResult.rows.map(async (row) => {
          const conditionsResult = await this.client.execute({
              sql: "SELECT condition_id FROM release_conditions WHERE release_id = ?",
              args: [row.id]
          });
          const conditionIds = conditionsResult.rows.map((r: any) => r.condition_id as string);
          return this.rowToRelease(row, conditionIds);
      }));

      return { releases, total };
  }
  
  async getActiveReleasesForApp(appId: string): Promise<{ releases: Release[]; total: number; }> {
      const releasesResult = await this.client.execute({
          sql: "SELECT * FROM releases WHERE application_id = ? AND status = ? ORDER BY created_at DESC",
          args: [appId, ReleaseStatus.ACTIVE]
      });

      const releases = await Promise.all(releasesResult.rows.map(async (row) => {
          const conditionsResult = await this.client.execute({
              sql: "SELECT condition_id FROM release_conditions WHERE release_id = ?",
              args: [row.id]
          });
          const conditionIds = conditionsResult.rows.map((r: any) => r.condition_id as string);
          return this.rowToRelease(row, conditionIds);
      }));
      
      return { releases, total: releases.length };
  }

  async updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release> {
      const { conditionIds, ...releaseUpdates } = updates;

      const tx = await this.client.transaction("write");
      try {
        if (Object.keys(releaseUpdates).length > 0) {
            await tx.execute({
                sql: "UPDATE releases SET version_name = ?, version_code = ?, status = ? WHERE id = ? AND application_id = ?",
                args: [releaseUpdates.versionName, releaseUpdates.versionCode, releaseUpdates.status, releaseId, appId]
            });
        }
        
        if (conditionIds) {
            await tx.execute({
                sql: "DELETE FROM release_conditions WHERE release_id = ?",
                args: [releaseId]
            });
            for(const conditionId of conditionIds) {
                await tx.execute({
                    sql: "INSERT INTO release_conditions (release_id, condition_id) VALUES (?, ?)",
                    args: [releaseId, conditionId]
                });
            }
        }
        await tx.commit();
      } catch (e) {
          await tx.rollback();
          throw e;
      }
      
      const release = await this.getRelease(appId, releaseId);
      if (!release) throw new Error("Failed to get release after update");
      return release;
  }
  
  async deleteRelease(appId: string, releaseId: string): Promise<void> {
      await this.client.execute({
          sql: "DELETE FROM releases WHERE id = ? AND application_id = ?",
          args: [releaseId, appId]
      });
  }
  
  private rowToCondition(row: any): Condition {
      return {
          id: row.id as string,
          applicationId: row.application_id as string,
          name: row.name as string,
          rules: {
              countries: row.rules_countries ? JSON.parse(row.rules_countries) : [],
              companyIds: row.rules_company_ids ? JSON.parse(row.rules_company_ids) : [],
              driverIds: row.rules_driver_ids ? JSON.parse(row.rules_driver_ids) : [],
              vehicleIds: row.rules_vehicle_ids ? JSON.parse(row.rules_vehicle_ids) : [],
          },
          createdAt: new Date(row.created_at as string)
      };
  }

  async createCondition(appId: string, conditionData: Omit<Condition, "id" | "createdAt" | "applicationId">): Promise<Condition> {
      const id = randomUUID();
      const createdAt = new Date();
      const rules = conditionData.rules || {};
      await this.client.execute({
          sql: `INSERT INTO conditions (id, application_id, name, rules_countries, rules_company_ids, rules_driver_ids, rules_vehicle_ids, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id, 
            appId, 
            conditionData.name, 
            JSON.stringify(rules.countries || []), 
            JSON.stringify(rules.companyIds || []), 
            JSON.stringify(rules.driverIds || []), 
            JSON.stringify(rules.vehicleIds || []), 
            createdAt.toISOString()
          ]
      });
      return { id, applicationId: appId, createdAt, ...conditionData };
  }

  async getCondition(appId: string, conditionId: string): Promise<Condition | null> {
      const result = await this.client.execute({
          sql: "SELECT * FROM conditions WHERE id = ? AND application_id = ?",
          args: [conditionId, appId]
      });
      if (result.rows.length === 0) return null;
      return this.rowToCondition(result.rows[0]);
  }

  async getConditionsForApp(appId: string): Promise<Condition[]> {
      const result = await this.client.execute({
          sql: "SELECT * FROM conditions WHERE application_id = ? ORDER BY created_at DESC",
          args: [appId]
      });
      return result.rows.map(this.rowToCondition);
  }

  async updateCondition(appId: string, conditionId: string, updates: Partial<Omit<Condition, "id" | "createdAt" | "applicationId">>): Promise<Condition> {
      const rules = updates.rules || {};
      await this.client.execute({
          sql: `UPDATE conditions SET name = ?, rules_countries = ?, rules_company_ids = ?, rules_driver_ids = ?, rules_vehicle_ids = ?
                WHERE id = ? AND application_id = ?`,
          args: [
            updates.name, 
            JSON.stringify(rules.countries || []), 
            JSON.stringify(rules.companyIds || []), 
            JSON.stringify(rules.driverIds || []), 
            JSON.stringify(rules.vehicleIds || []), 
            conditionId, 
            appId
        ]
      });
      const condition = await this.getCondition(appId, conditionId);
      if (!condition) throw new Error("Could not find condition after update");
      return condition;
  }

  async deleteCondition(appId: string, conditionId: string): Promise<void> {
      await this.client.execute({
          sql: "DELETE FROM conditions WHERE id = ? AND application_id = ?",
          args: [conditionId, appId]
      });
  }
}
