import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { DriverActivityLog } from '@/types/driver';

// Request schema validation
const checkReleaseSchema = z.object({
  appId: z.string().uuid('Invalid app ID format'),
  country: z.string().min(1, 'Country is required'),
  companyId: z.number().int('Company ID must be an integer'),
  driverId: z.number().int('Driver ID must be an integer'),
  vehicleId: z.number().int('Vehicle ID must be an integer'),
  companyRef: z.string().optional(),
  driverRef: z.string().optional(),
  vehicleRef: z.string().optional(),
  versionName: z.string().min(1, 'Version name is required'),
  versionCode: z.number().int().positive('Version code must be a positive integer'),
});

// Response types
interface UpdateRequired {
  updateRequired: true;
  currentVersion: {
    versionName: string;
    versionCode: number;
  };
  latestVersion: {
    id: string;
    versionName: string;
    versionCode: number;
    downloadUrl?: string;
  };
  message: string;
}

interface UpdateNotRequired {
  updateRequired: false;
  currentVersion: {
    versionName: string;
    versionCode: number;
  };
  message: string;
}

type CheckReleaseResponse = UpdateRequired | UpdateNotRequired;

async function handleRequest(requestData: any) {
  try {
    const validatedData = checkReleaseSchema.parse(requestData);

    const { appId, country, companyId, driverId, vehicleId, versionName, versionCode } = validatedData;
    
    // Log the API call
    await db.logDriverActivity(validatedData as Omit<DriverActivityLog, "id" | "createdAt">);

    // Get available releases for the driver's context
    const availableReleases = await db.getAvailableReleasesForContext(appId, {
      country,
      companyId: companyId,
      driverId: String(driverId), // Condition matching expects string
      vehicleId: String(vehicleId), // Condition matching expects string
    });

    // Find the latest available release
    const latestRelease = availableReleases[0]; // Already sorted by version_code DESC

    if (!latestRelease) {
      // No releases available for this context
      return NextResponse.json({
        updateRequired: false,
        currentVersion: { versionName, versionCode },
        message: 'No releases available for your context',
      } as UpdateNotRequired);
    }

    // Compare version codes
    if (latestRelease.versionCode > versionCode) {
      // Update required
      return NextResponse.json({
        updateRequired: true,
        currentVersion: { versionName, versionCode },
        latestVersion: {
          id: latestRelease.id,
          versionName: latestRelease.versionName,
          versionCode: latestRelease.versionCode,
        },
        message: `Update required: ${latestRelease.versionName} (${latestRelease.versionCode}) is available`,
      } as UpdateRequired);
    } else {
      // Current version is up to date
      return NextResponse.json({
        updateRequired: false,
        currentVersion: { versionName, versionCode },
        message: 'Current version is up to date',
      } as UpdateNotRequired);
    }

  } catch (error) {
    console.error('Error in release check API:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors,
      }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to check release requirements',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleRequest(body);
}

// Handle GET requests with query parameters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
    
  const queryData = {
    appId: searchParams.get('appId'),
    country: searchParams.get('country'),
    companyId: searchParams.get('companyId') ? parseInt(searchParams.get('companyId')!, 10) : undefined,
    driverId: searchParams.get('driverId') ? parseInt(searchParams.get('driverId')!, 10) : undefined,
    vehicleId: searchParams.get('vehicleId') ? parseInt(searchParams.get('vehicleId')!, 10) : undefined,
    companyRef: searchParams.get('companyRef') || undefined,
    driverRef: searchParams.get('driverRef') || undefined,
    vehicleRef: searchParams.get('vehicleRef') || undefined,
    versionName: searchParams.get('versionName'),
    versionCode: searchParams.get('versionCode') ? parseInt(searchParams.get('versionCode')!, 10) : undefined,
  };
  
  return handleRequest(queryData);
}
