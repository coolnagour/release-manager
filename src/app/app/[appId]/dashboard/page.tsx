
"use client";

import { useParams } from "next/navigation";
import { getApp } from "@/actions/app-actions";
import { useEffect, useState } from "react";
import { Application } from "@/types/application";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function AppDashboardPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  useEffect(() => {
    if (appId && userProfile) {
      if (!userProfile.roles?.[appId]) {
        setError("You are not authorized to view this application.");
        setLoading(false);
        return;
      }

      getApp(appId)
        .then((data) => {
          if (data) {
            setApp(data);
          } else {
            setError("Application not found.");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch app", err);
          setError("Failed to load application data.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [appId, userProfile]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
            {loading ? <Skeleton className="h-9 w-64" /> : app?.name ? `${app.name} Dashboard` : "Dashboard"}
        </h1>
        {loading ? <Skeleton className="h-5 w-48 mt-2" /> : <p className="text-muted-foreground">Welcome! Here is an overview of your application.</p>}
      </div>

       {loading ? (
        <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <p className="text-destructive text-center">{error}</p>
      ) : app ? (
        <Card>
            <CardHeader>
                <CardTitle>Application Details</CardTitle>
                <CardDescription>
                    Information about your selected application.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>
                    <strong>Name:</strong> {app.name}
                </p>
                <p>
                    <strong>Package Name:</strong> {app.packageName}
                </p>
                 <p className="text-sm text-muted-foreground mt-4">
                    Created: {new Date(app.createdAt).toLocaleDateString()}
                </p>
            </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default AppDashboardPage;
