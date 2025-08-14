"use client";

import { Header } from "@/components/header";
import { CreateAppForm } from "@/components/create-app-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProtectedRoute } from "@/contexts/auth-context";

function CreateAppPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
          <Card className="w-full max-w-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Create a New Application</CardTitle>
              <CardDescription>
                Fill out the details below to add a new application to the release manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateAppForm />
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default CreateAppPage;
