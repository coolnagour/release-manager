
export interface Driver {
  id: string;
  createdAt: Date;
  applicationId: string;
  country: string;
  companyId: number;
  driverId: number;
  vehicleId: number;
  companyRef?: string;
  driverRef?: string;
  vehicleRef?: string;
  versionName: string;
  versionCode: number;
}
