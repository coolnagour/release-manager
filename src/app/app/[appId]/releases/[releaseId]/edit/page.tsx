
"use client";

import { EditReleaseForm } from "@/components/edit-release-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/roles";
import { Release } from "@/types/release";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Condition } from "@/types/condition";
import { getConditionsForApp } from "@/actions/condition-actions";
import { getRelease } from "@/actions/release-actions";
import { ReleaseEvaluator } from "@/components/release-evaluator";


function EditReleasePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
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
        const fetchData = async () => {
            try {
                const [releaseData, conditionsData] = await Promise.all([
                    getRelease(appId, releaseId),
                    getConditionsForApp(appId)
                ]);

                if (releaseData) {
                    setRelease(releaseData);
                    setConditions(conditionsData);
                } else {
                    router.replace(`/app/${appId}/releases`); // Release not found
                }
            } catch (error) {
                console.error("Failed to fetch release or conditions", error);
                router.replace(`/app/${appId}/releases`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }
  }, [appId, releaseId, userProfile, authLoading, router]);

  const isLoading = authLoading || loading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
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
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 gap-6">
      <div>
         <Button variant="ghost" asChild className="mb-4">
            <Link href={`/app/${appId}/releases`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Releases
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Release</h1>
        <p className="text-muted-foreground">Update the details for {release.versionName}.</p>
      </div>
      <Card className="w-full shadow-lg">
        <CardContent className="pt-6">
          <EditReleaseForm appId={appId} release={release} conditions={conditions} />
        </CardContent>
      </Card>
       <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle>Evaluate Release</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseEvaluator appId={appId} releaseId={release.id} />
        </CardContent>
      </Card>
    </div>
  );
}

export default EditReleasePage;
