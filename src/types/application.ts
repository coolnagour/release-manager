
import { Role } from "./roles";

export interface ApplicationUser {
    email: string;
    role: Role;
}

export interface Application {
  id: string;
  name: string;
  packageName: string;
  users: ApplicationUser[];
  ownerId: string;
  createdAt: Date;
}
