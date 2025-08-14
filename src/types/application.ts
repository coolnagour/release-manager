export interface Application {
  id: string;
  name: string;
  packageName: string;
  users: string[];
  ownerId: string;
  createdAt: Date;
}
