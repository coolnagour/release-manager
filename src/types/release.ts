
export enum ReleaseStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  DEPRECATED = "deprecated",
  ARCHIVED = "archived",
}


export interface Release {
  id: string;
  versionName: string;
  versionCode: number;
  status: ReleaseStatus;
  applicationId: string;
  createdAt: Date;
  conditionIds: string[];
}
