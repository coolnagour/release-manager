
"use client";

import { ConditionForm } from "@/components/condition-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/roles";
import { Condition } from "@/types/condition";
import { getCondition } from "@/actions/condition-actions";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function EditConditionPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [condition, setCondition] = useState<Condition | null>(null);
  const [loading, setLoading] = useState(true);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;
  const conditionId = Array.isArray(params.conditionId) ? params.conditionId[0] : params.conditionId;

  useEffect(() => {
    if (!authLoading) {
      const canManage = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;
      if (!canManage) {
        router.replace(`/app/${appId}/conditions`);
        return;
      }
    }

    if (appId && conditionId) {
      getCondition(appId, conditionId)
        .then(data => {
          if (data) {
            setCondition(data);
          } else {
            router.replace(`/app/${appId}/conditions`); // Condition not found
          }
        })
        .finally(() => setLoading(false));
    }
  }, [appId, conditionId, userProfile, authLoading, router]);

  const isLoading = authLoading || loading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Card className="w-full shadow-lg flex-1">
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!condition) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p>Condition not found.</p>
      </div>
    );
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
        <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Condition</h1>
        <p className="text-muted-foreground">Update the rules for {condition.name}.</p>
      </div>
      <Card className="w-full shadow-lg flex-1 flex flex-col">
        <CardContent className="pt-6 h-full flex-1 flex flex-col">
          <ConditionForm appId={appId} condition={condition} />
        </CardContent>
      </Card>
    </div>
  );
}

export default EditConditionPage;
