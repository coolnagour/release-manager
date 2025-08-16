
"use client";

import { ReleaseEvaluator } from "@/components/release-evaluator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EvaluatePage() {
  const params = useParams();
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/app/${appId}/dashboard`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Release Evaluator</h1>
        <p className="text-muted-foreground">
          Find the latest available release for a specific user context.
        </p>
      </div>

      <Card className="w-full shadow-lg">
        <CardContent className="pt-6">
          <ReleaseEvaluator appId={appId} />
        </CardContent>
      </Card>
    </div>
  );
}
