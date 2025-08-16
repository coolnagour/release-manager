
"use client";

import { EditReleaseForm } from "@/components/edit-release-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/roles";
import { Release } from "@/types/release";
import { db } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function getRelease(appId: string, releaseId: string): Promise<Release | null> {
    const app = await db.getApp(appId);
    if (!app) return null;
    const releaseRef = await db.getReleasesForApp(appId, 1, 1000); // simplified for example
    const release = releaseRef.releases.find(r => r.id === releaseId);
    return release || null;
}


function EditReleasePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;
  const releaseId = Array.isArray(params.releaseId) ? params.releaseId[0] : params.releaseId;

  useEffect(() => {
    if (!authLoading) {
      const canManage = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;
      if (!canManage) {
        router.replace(`/app/${appId}/releases`);
        return;
      }
    }

    if (appId && releaseId) {
        const fetchRelease = async () => {
            const releaseData = await getRelease(appId, releaseId);
             if (releaseData) {
                setRelease(releaseData);
            } else {
                router.replace(`/app/${appId}/releases`); // Release not found
            }
            setLoading(false);
        }
        fetchRelease();
    }
  }, [appId, releaseId, userProfile, authLoading, router]);

  const isLoading = authLoading || loading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Card className="w-full shadow-lg flex-1">
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p>Release not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
      <div className="mb-6">
         <Button variant="ghost" asChild className="mb-4">
            <Link href={`/app/${appId}/releases`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Releases
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Release</h1>
        <p className="text-muted-foreground">Update the details for {release.versionName}.</p>
      </div>
      <Card className="w-full shadow-lg flex-1 flex flex-col">
        <CardContent className="pt-6 h-full flex-1 flex flex-col">
          <EditReleaseForm appId={appId} release={release} />
        </CardContent>
      </Card>
    </div>
  );
}

export default EditReleasePage;
