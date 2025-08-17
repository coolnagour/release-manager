import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Request schema validation
const checkReleaseSchema = z.object({
  appId: z.string().uuid('Invalid app ID format'),
  country: z.string().min(1, 'Country is required'),
  company: z.number().int().positive('Company must be a positive integer'),
  driver: z.string().min(1, 'Driver ID is required'),
  vehicle: z.string().min(1, 'Vehicle ID is required'),
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

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = checkReleaseSchema.parse(body);

    const { appId, country, company, driver, vehicle, versionName, versionCode } = validatedData;

    // Get available releases for the driver's context
    const availableReleases = await db.getAvailableReleasesForContext(appId, {
      country,
      companyId: company,
      driverId: driver,
      vehicleId: vehicle,
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
          // downloadUrl could be added here if you have download URLs
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

// Handle GET requests with query parameters (alternative interface)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const queryData = {
      appId: searchParams.get('appId'),
      country: searchParams.get('country'),
      company: searchParams.get('company') ? parseInt(searchParams.get('company')!) : undefined,
      driver: searchParams.get('driver'),
      vehicle: searchParams.get('vehicle'),
      versionName: searchParams.get('versionName'),
      versionCode: searchParams.get('versionCode') ? parseInt(searchParams.get('versionCode')!) : undefined,
    };

    // Validate required parameters
    const validatedData = checkReleaseSchema.parse(queryData);

    const { appId, country, company, driver, vehicle, versionName, versionCode } = validatedData;

    // Get available releases for the driver's context
    const availableReleases = await db.getAvailableReleasesForContext(appId, {
      country,
      companyId: company,
      driverId: driver,
      vehicleId: vehicle,
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