import { Application } from "@/types/application";
import { FirestoreDataService } from "./firestore";

export interface DataService {
  createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application>;
  getApp(id: string): Promise<Application | null>;
  getAppsForUser(userEmail: string): Promise<Application[]>;
  updateApp(id: string, updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>): Promise<Application>;
  deleteApp(id: string): Promise<void>;
}

// For now, we are hardcoding the Firestore implementation.
// In the future, we can use an environment variable to switch between implementations.
export const db: DataService = new FirestoreDataService();
