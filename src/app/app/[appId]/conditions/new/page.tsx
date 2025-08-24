
"use client";

import { ConditionForm } from "@/components/condition-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/types/roles";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function NewConditionPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  useEffect(() => {
    if (!loading && userProfile) {
      const userRoleForApp = userProfile.roles?.[appId];
      const canManage = userRoleForApp === Role.SUPERADMIN || userRoleForApp === Role.ADMIN;
      if (!canManage) {
        router.replace(`/app/${appId}/conditions`);
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
                <Link href={`/app/${appId}/conditions`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Conditions
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Create New Condition</h1>
            <p className="text-muted-foreground">Define the rules for a new release condition.</p>
        </div>
        <Card className="w-full shadow-lg flex-1 flex flex-col">
            <CardContent className="pt-6 h-full flex-1 flex flex-col">
              <ConditionForm appId={appId} />
            </CardContent>
        </Card>
    </div>
  );
}

export default NewConditionPage;
