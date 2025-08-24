
"use client";

import { useParams } from "next/navigation";
import { getApp, getDriverDistribution } from "@/actions/app-actions";
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type DriverDistribution = {
    versionCode: number;
    versionName: string;
    count: number;
}[];

function AppDashboardPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [distribution, setDistribution] = useState<DriverDistribution>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  useEffect(() => {
    if (appId && userProfile) {
      if (!userProfile.roles?.[appId] && !userProfile.isSuperAdmin) {
        setError("You are not authorized to view this application.");
        setLoading(false);
        return;
      }

      setLoading(true);
      Promise.all([
        getApp(appId),
        getDriverDistribution(appId)
      ]).then(([appData, distData]) => {
          if (appData) {
            setApp(appData);
          } else {
            setError("Application not found.");
          }
          setDistribution(distData);
        })
        .catch((err) => {
          console.error("Failed to fetch app data", err);
          setError("Failed to load application data.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [appId, userProfile]);
  
  const chartData = distribution.map(d => ({
    name: `${d.versionName} (${d.versionCode})`,
    drivers: d.count,
  }));
  
  const chartConfig = {
    drivers: {
      label: "Drivers",
      color: "hsl(var(--primary))",
    },
  };


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
            <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <p className="text-destructive text-center">{error}</p>
      ) : app ? (
        <div className="grid gap-6">
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

            <Card>
                <CardHeader>
                    <CardTitle>Driver Distribution by Release</CardTitle>
                    <CardDescription>
                        Number of drivers on each release version.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {distribution.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                            <BarChart accessibilityLayer data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 15)}
                                />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="drivers" fill="var(--color-drivers)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-40 items-center justify-center">
                            <p className="text-muted-foreground">No driver activity logged yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      ) : null}
    </div>
  );
}

export default AppDashboardPage;
