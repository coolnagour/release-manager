
import "server-only";

import { initializeApp, getApps, AppOptions, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { DataService } from ".";
import { Application } from "@/types/application";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let appOptions: AppOptions | undefined = undefined;

if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    appOptions = {
      credential: cert(serviceAccount),
    };
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
  }
}

if (!getApps().length) {
  initializeApp(appOptions);
}

const firestore = getFirestore();
const appsCollection = firestore.collection("applications");

export class FirestoreDataService implements DataService {
  private toApplication(doc: FirebaseFirestore.DocumentSnapshot): Application {
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      packageName: data.packageName,
      allowedEmails: data.allowedEmails,
      ownerId: data.ownerId,
      createdAt: (data.createdAt as Timestamp).toDate(),
    };
  }

  async createApp(appData: Omit<Application, "id" | "createdAt">): Promise<Application> {
    const appRef = await appsCollection.add({
      ...appData,
      createdAt: Timestamp.now(),
    });
    const newAppDoc = await appRef.get();
    return this.toApplication(newAppDoc);
  }

  async getApp(id: string): Promise<Application | null> {
    const doc = await appsCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toApplication(doc);
  }

  async getAppsForUser(userEmail: string): Promise<Application[]> {
    const snapshot = await appsCollection
      .where("allowedEmails", "array-contains", userEmail)
      .orderBy("createdAt", "desc")
      .get();
      
    return snapshot.docs.map(this.toApplication);
  }

  async updateApp(
    id: string,
    updates: Partial<Omit<Application, "id" | "ownerId" | "createdAt">>
  ): Promise<Application> {
    await appsCollection.doc(id).update(updates);
    const updatedDoc = await this.getApp(id);
    if (!updatedDoc) {
      throw new Error("Failed to update app: App not found.");
    }
    return updatedDoc;
  }

  async deleteApp(id: string): Promise<void> {
    await appsCollection.doc(id).delete();
  }
}
