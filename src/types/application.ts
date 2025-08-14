export interface Application {
  id: string;
  name: string;
  packageName: string;
  allowedEmails: string[];
  ownerId: string;
  createdAt: Date;
}
