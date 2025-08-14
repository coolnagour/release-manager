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
import { ProtectedRoute } from "@/contexts/auth-context";

const apps = [
  {
    name: "Mobile App",
    packageName: "com.example.mobileapp",
    version: "1.2.5",
  },
  {
    name: "Web Portal",
    packageName: "com.example.webportal",
    version: "2.0.1",
  },
  {
    name: "API Service",
    packageName: "com.example.apiservice",
    version: "3.1.0-alpha",
  },
  {
    name: "Data Processor",
    packageName: "com.example.dataprocessor",
    version: "1.0.0",
  },
];

function AppPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold tracking-tight mb-6 font-headline">
            Your Applications
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <Link href="#" key={app.packageName}>
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
                      Current Version: {app.version}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default AppPage;
