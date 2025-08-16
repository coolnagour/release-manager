
import "server-only";

import { initializeApp, getApps, AppOptions, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { DataService } from ".";
import { Application } from "@/types/application";
import { UserProfile } from "@/types/user-profile";
import { Role } from "@/types/roles";
import { Release, ReleaseStatus } from "@/types/release";
import { Condition } from "@/types/condition";

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
      users: data.users || [],
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

  private toRelease(doc: FirebaseFirestore.DocumentSnapshot): Release {
    const data = doc.data()!;
    return {
        id: doc.id,
        versionName: data.versionName,
        versionCode: data.versionCode,
        status: data.status || ReleaseStatus.ACTIVE,
        applicationId: data.applicationId,
        createdAt: (data.createdAt as Timestamp).toDate(),
    };
  }

  private toCondition(doc: FirebaseFirestore.DocumentSnapshot): Condition {
    const data = doc.data()!;
    return {
        id: doc.id,
        name: data.name,
        rules: data.rules,
        applicationId: data.applicationId,
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
      .where("users", "array-contains", userEmail)
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

    const newUser: Omit<UserProfile, "createdAt"> & { createdAt: Date} = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      role: isFirstUser ? Role.SUPERADMIN : Role.USER,
      createdAt: new Date(),
    };

    await userRef.set({
      ...newUser,
      createdAt: Timestamp.fromDate(newUser.createdAt),
    });
    
    const createdDoc = await userRef.get();
    return this.toUserProfile(createdDoc);
  }

  async getSuperAdminsForApp(userEmails: string[]): Promise<UserProfile[]> {
    if (userEmails.length === 0) {
        return [];
    }
    const snapshot = await usersCollection
        .where('email', 'in', userEmails)
        .where('role', '==', Role.SUPERADMIN)
        .get();

    return snapshot.docs.map(this.toUserProfile);
  }

  async createRelease(appId: string, releaseData: Omit<Release, "id" | "createdAt" | "applicationId">): Promise<Release> {
      const releaseRef = await appsCollection.doc(appId).collection("releases").add({
          ...releaseData,
          applicationId: appId,
          createdAt: Timestamp.now(),
      });
      const newReleaseDoc = await releaseRef.get();
      return this.toRelease(newReleaseDoc);
  }

  async getReleasesForApp(appId: string, page: number, limit: number): Promise<{ releases: Release[], total: number }> {
      const releasesRef = appsCollection.doc(appId).collection("releases");
      
      const totalSnapshot = await releasesRef.count().get();
      const total = totalSnapshot.data().count;

      const offset = (page - 1) * limit;

      const snapshot = await releasesRef
          .orderBy("createdAt", "desc")
          .limit(limit)
          .offset(offset)
          .get();

      const releases = snapshot.docs.map(this.toRelease);
      return { releases, total };
  }

    async updateRelease(appId: string, releaseId: string, updates: Partial<Omit<Release, "id" | "createdAt" | "applicationId">>): Promise<Release> {
        const releaseRef = appsCollection.doc(appId).collection("releases").doc(releaseId);
        await releaseRef.update(updates);
        const updatedDoc = await releaseRef.get();
        if (!updatedDoc.exists) {
            throw new Error("Failed to update release: Release not found.");
        }
        return this.toRelease(updatedDoc);
    }

    async deleteRelease(appId: string, releaseId: string): Promise<void> {
        const releaseRef = appsCollection.doc(appId).collection("releases").doc(releaseId);
        await releaseRef.delete();
    }

    async createCondition(appId: string, conditionData: Omit<Condition, "id" | "createdAt" | "applicationId">): Promise<Condition> {
      const conditionRef = await appsCollection.doc(appId).collection("conditions").add({
          ...conditionData,
          applicationId: appId,
          createdAt: Timestamp.now(),
      });
      const newConditionDoc = await conditionRef.get();
      return this.toCondition(newConditionDoc);
    }

    async getConditionsForApp(appId: string): Promise<Condition[]> {
        const snapshot = await appsCollection.doc(appId).collection("conditions")
            .orderBy("createdAt", "desc")
            .get();
        return snapshot.docs.map(this.toCondition);
    }

    async updateCondition(appId: string, conditionId: string, updates: Partial<Omit<Condition, "id" | "createdAt" | "applicationId">>): Promise<Condition> {
        const conditionRef = appsCollection.doc(appId).collection("conditions").doc(conditionId);
        await conditionRef.update(updates);
        const updatedDoc = await conditionRef.get();
        if (!updatedDoc.exists) {
            throw new Error("Failed to update condition: Condition not found.");
        }
        return this.toCondition(updatedDoc);
    }

    async deleteCondition(appId: string, conditionId: string): Promise<void> {
        const conditionRef = appsCollection.doc(appId).collection("conditions").doc(conditionId);
        await conditionRef.delete();
    }
}
