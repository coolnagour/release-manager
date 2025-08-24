
"use client";

import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function ManageUsersPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userProfile?.isSuperAdmin) {
      router.replace('/');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile?.isSuperAdmin) {
    return (
       <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-8 flex items-center justify-center">
            <p>Loading or unauthorized...</p>
        </main>
      </div>
    )
  }

  return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-8">
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Manage Users</CardTitle>
              <CardDescription>
                Here you can view, add, and manage all users in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>User management functionality will be implemented here.</p>
            </CardContent>
          </Card>
        </main>
      </div>
  );
}

export default ManageUsersPage;
