
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
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateUserDialog } from "@/components/create-user-dialog";

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
          <div className="flex justify-between items-center mb-6">
            <div>
              <CardTitle className="text-2xl font-headline">Manage Users</CardTitle>
              <CardDescription>
                Here you can view, add, and manage all users in the system.
              </CardDescription>
            </div>
            <CreateUserDialog>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New User
                </Button>
            </CreateUserDialog>
          </div>
          <Card className="w-full shadow-lg">
            <CardContent className="pt-6">
              <p>User management functionality will be implemented here.</p>
            </CardContent>
          </Card>
        </main>
      </div>
  );
}

export default ManageUsersPage;
