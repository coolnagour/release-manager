
import "server-only";

import { initializeApp, getApps, AppOptions, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { DataService } from ".";
import { Application } from "@/types/application";
import { UserProfile } from "@/types/user-profile";

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
const usersCollection = firestore.collection("users");

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

  private toUserProfile(doc: FirebaseFirestore.DocumentSnapshot): UserProfile {
    const data = doc.data()!;
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      role: data.role,
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

  async findOrCreateUser(
    userData: Pick<UserProfile, "uid" | "email" | "displayName" | "photoURL">
  ): Promise<UserProfile> {
    const userRef = usersCollection.doc(userData.uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return this.toUserProfile(userDoc);
    }

    const usersSnapshot = await usersCollection.limit(1).get();
    const isFirstUser = usersSnapshot.empty;

    const newUser: UserProfile = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      role: isFirstUser ? "superadmin" : "user",
      createdAt: new Date(),
    };

    await userRef.set({
      ...newUser,
      createdAt: Timestamp.fromDate(newUser.createdAt),
    });
    return newUser;
  }
}
