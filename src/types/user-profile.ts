export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "superadmin" | "admin" | "user";
  createdAt: Date;
}
