
"use client";

import { CreateAppForm } from "@/components/create-app-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/roles";
import { Application } from "@/types/application";
import { getApp } from "@/actions/app-actions";
import { Skeleton } from "@/components/ui/skeleton";

function EditAppPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  useEffect(() => {
    if (!authLoading && userProfile) {
        const userRoleForApp = userProfile.roles?.[appId];
        if (userRoleForApp !== Role.SUPERADMIN && userRoleForApp !== Role.ADMIN) {
            router.replace(`/app/${appId}/dashboard`);
            return;
        }
    }

    if (appId) {
        getApp(appId)
            .then(data => {
                if(data) {
                    setApp(data);
                } else {
                    router.replace('/'); // App not found
                }
            })
            .finally(() => setLoading(false));
    }
  }, [appId, userProfile, authLoading, router]);

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
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!app) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <p>Application not found.</p>
        </div>
    )
  }

  return (
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
          <div className="mb-6">
             <h1 className="text-3xl font-bold tracking-tight font-headline">Application Settings</h1>
             <p className="text-muted-foreground">Update the details for {app.name}.</p>
          </div>
          <Card className="w-full shadow-lg flex-1 flex flex-col">
            <CardContent className="pt-6 h-full flex-1 flex flex-col">
              <CreateAppForm application={app} />
            </CardContent>
          </Card>
      </div>
  );
}

export default EditAppPage;
