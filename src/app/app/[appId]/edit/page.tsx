
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApp } from "@/actions/app-actions";
import { Application } from "@/types/application";
import { Header } from "@/components/header";
import { CreateAppForm } from "@/components/create-app-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

function EditAppPage() {
  const params = useParams();
  const { user } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  useEffect(() => {
    if (appId && user?.email) {
      getApp(appId)
        .then((data) => {
          if (data) {
             if (!data.allowedEmails.includes(user.email!)) {
              setError("You are not authorized to edit this application.");
            } else {
              setApp(data);
            }
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
  }, [appId, user]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Edit Application</CardTitle>
            <CardDescription>
              Update the details for your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-32 ml-auto" />
                </div>
            ) : error ? (
                <p className="text-destructive text-center">{error}</p>
            ) : app ? (
              <CreateAppForm application={app} />
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default EditAppPage;
