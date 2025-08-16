
"use client";

import { CreateReleaseForm } from "@/components/create-release-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/types/roles";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function NewReleasePage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;
  const versionCode = searchParams.get('versionCode');

  useEffect(() => {
    if (!loading) {
      const canManage = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;
      if (!canManage) {
        router.replace(`/app/${appId}/releases`);
      }
    }
  }, [userProfile, loading, router, appId]);

  if (loading) {
    return <p className="p-8">Loading...</p>;
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
              <CreateReleaseForm appId={appId} initialVersionCode={versionCode || undefined}/>
            </CardContent>
        </Card>
    </div>
  );
}

export default NewReleasePage;
