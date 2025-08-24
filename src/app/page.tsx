
"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { Application } from "@/types/application";
import { getAppsForUser } from "@/actions/app-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Role } from "@/types/roles";

function AppPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = userProfile && Object.values(userProfile.roles).includes(Role.SUPERADMIN);

  useEffect(() => {
    if (user?.uid) {
      getAppsForUser(user.uid)
        .then((userApps) => {
          setApps(userApps);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch apps", err);
          setLoading(false);
        });
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6 font-headline">
          Your Applications
        </h1>
        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : apps.length === 0 ? (
          <p>
            No applications found.
            {isSuperAdmin && (
              <Link href="/app/new" className="text-primary hover:underline ml-1">
                Create one now
              </Link>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <Link href={`/app/${app.id}/dashboard`} key={app.id}>
                <Card className="h-full hover:shadow-md transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-primary" />
                      {app.name}
                    </CardTitle>
                    <CardDescription>{app.packageName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AppPage;
