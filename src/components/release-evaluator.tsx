
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { evaluateContext, evaluateRelease, EvaluationContext } from "@/actions/release-actions";
import { useState, useTransition } from "react";
import { Release } from "@/types/release";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircle, XCircle, Terminal, Info } from "lucide-react";
import { countries } from "@/lib/countries";
import { Card } from "./ui/card";
import Link from "next/link";
import { Combobox } from "./ui/combobox";

const formSchema = z.object({
  country: z.string().min(1, "Country is required"),
  companyId: z.string().min(1, "Company ID is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ReleaseEvaluatorProps {
    appId: string;
    releaseId?: string; // If present, evaluates a specific release. Otherwise, finds the latest.
}

const countryOptions = countries.map(country => ({
    value: country.code,
    label: country.name,
}));

export function ReleaseEvaluator({ appId, releaseId }: ReleaseEvaluatorProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info'; message: string, data?: Release | null | boolean | {release: Release, isAvailable: boolean, availableRelease: Release | null} } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "",
      companyId: "",
      driverId: "",
      vehicleId: "",
    },
  });

  function onSubmit(values: FormValues) {
    const companyId = parseInt(values.companyId, 10);
    
    if (isNaN(companyId)) {
        toast({ title: "Invalid Input", description: "Company ID must be a number.", variant: "destructive" });
        return;
    }
    
    const context: EvaluationContext = {
      country: values.country,
      companyId: companyId,
      driverId: values.driverId,
      vehicleId: values.vehicleId,
    };

    setResult(null);

    startTransition(async () => {
      const response = releaseId
        ? await evaluateRelease(appId, releaseId, context)
        : await evaluateContext(appId, context);

      if (response.error) {
        setResult({ type: "error", message: response.error });
      } else if (releaseId) { // Specific release evaluation
        const evaluationData = response.data as {release: Release, isAvailable: boolean, availableRelease: Release | null};
        if (evaluationData.isAvailable) {
          setResult({ type: "success", message: "This release is available for the given context.", data: evaluationData });
        } else {
          setResult({ type: "info", message: "This release is NOT available for the given context.", data: evaluationData });
        }
      } else { // Latest release evaluation
        const latestRelease = response.data;
        if (latestRelease) {
          setResult({ type: "success", message: "The latest available release was found.", data: latestRelease });
        } else {
          setResult({ type: "info", message: "No active release is available for the given context.", data: null });
        }
      }
    });
  }

  const renderResult = () => {
    if (!result) return null;

    if (result.type === 'error') {
      return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )
    }

    if (releaseId) { // Specific release mode
      const evaluationData = result.data as {release: Release, isAvailable: boolean, availableRelease: Release | null};
      const { release, isAvailable, availableRelease } = evaluationData;
      
      return (
        <div className="space-y-4">
          <Alert variant={isAvailable ? "default" : "destructive"} className={isAvailable ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}>
            {isAvailable ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle>Release Being Evaluated: {isAvailable ? 'Available' : 'Not Available'}</AlertTitle>
            <AlertDescription>
              Release <span className="font-bold">{release.versionName}</span> (Code: {release.versionCode}) {release.status !== 'active' ? `is ${release.status} and` : 'is'} {isAvailable ? 'available' : 'not available'} for the given context.
              <div className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/${appId}/releases/${release.id}/edit`}>View This Release</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          {availableRelease ? (
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4" />
              <AlertTitle>Available Release for This Context</AlertTitle>
              <AlertDescription>
                The release that would be available for this context is <span className="font-bold">{availableRelease.versionName}</span> (Code: {availableRelease.versionCode}).
                {availableRelease.id !== release.id && (
                  <div className="mt-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app/${appId}/releases/${availableRelease.id}/edit`}>View Available Release</Link>
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Available Release</AlertTitle>
              <AlertDescription>
                No release is available for this context.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )
    }

    // Latest release mode
    const release = result.data as Release | null;
    if(release) {
        return (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Release Found!</AlertTitle>
                <AlertDescription>
                   The latest available release is <span className="font-bold">{release.versionName}</span> (Code: {release.versionCode}).
                   <div className="mt-2">
                     <Button asChild variant="outline" size="sm">
                       <Link href={`/app/${appId}/releases/${release.id}/edit`}>View Release</Link>
                     </Button>
                   </div>
                </AlertDescription>
            </Alert>
        )
    } else {
        return (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No Release Found</AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
            </Alert>
        )
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                  <FormItem className="flex flex-col">
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                          <Combobox
                              options={countryOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select Country *"
                              searchPlaceholder="Search country..."
                              emptyResultText="No country found."
                              disabled={isPending}
                          />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Company ID *</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 12345" {...field} value={field.value ?? ""} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="driverId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Driver ID *</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., driver-abc" {...field} value={field.value ?? ""} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Vehicle ID *</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., vehicle-xyz" {...field} value={field.value ?? ""} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="mt-6">
            {renderResult()}
        </div>

        <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Evaluating..." : "Evaluate"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
