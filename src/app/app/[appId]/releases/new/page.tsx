
"use client";

import { CreateReleaseForm } from "@/components/create-release-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/roles";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Condition } from "@/types/condition";
import { getConditionsForApp } from "@/actions/condition-actions";
import { Skeleton } from "@/components/ui/skeleton";

function NewReleasePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loadingConditions, setLoadingConditions] = useState(true);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;
  const versionCodeParam = searchParams.get('versionCode');
  const versionCode = versionCodeParam ? parseInt(versionCodeParam, 10) : undefined;
  const versionName = searchParams.get('versionName') || undefined;

  useEffect(() => {
    if (!authLoading) {
      const canManage = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;
      if (!canManage) {
        router.replace(`/app/${appId}/releases`);
      }
    }
  }, [userProfile, authLoading, router, appId]);

  useEffect(() => {
    if (appId) {
      getConditionsForApp(appId)
        .then(setConditions)
        .finally(() => setLoadingConditions(false));
    }
  }, [appId]);

  const isLoading = authLoading || loadingConditions;

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
    )
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
            <h1 className="text-3xl font-bold tracking-tight font-headline">Create New Release</h1>
            <p className="text-muted-foreground">Define the details for a new release.</p>
        </div>
        <Card className="w-full shadow-lg flex-1 flex flex-col">
            <CardContent className="pt-6 h-full flex-1 flex flex-col">
              <CreateReleaseForm 
                appId={appId} 
                conditions={conditions} 
                initialVersionCode={versionCode}
                initialVersionName={versionName}
              />
            </CardContent>
        </Card>
    </div>
  );
}

export default NewReleasePage;
