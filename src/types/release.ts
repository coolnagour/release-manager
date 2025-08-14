
export enum ReleaseStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  DEPRECATED = "deprecated",
  ARCHIVED = "archived",
}


export interface Release {
  id: string;
  versionName: string;
  versionCode: string;
  status: ReleaseStatus;
  applicationId: string;
  createdAt: Date;
}
