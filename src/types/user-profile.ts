
import { Role } from "./roles";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isSuperAdmin: boolean;
  roles: { [appId: string]: Role };
  createdAt: Date;
}
