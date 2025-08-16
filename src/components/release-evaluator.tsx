
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import Link from "next/link";

const formSchema = z.object({
  country: z.string().optional(),
  companyId: z.string().optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ReleaseEvaluatorProps {
    appId: string;
    releaseId?: string; // If present, evaluates a specific release. Otherwise, finds the latest.
}

export function ReleaseEvaluator({ appId, releaseId }: ReleaseEvaluatorProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info'; message: string, data?: Release | null | boolean } | null>(null);

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
    const context: EvaluationContext = {
      country: values.country || undefined,
      companyId: values.companyId ? parseInt(values.companyId, 10) : undefined,
      driverId: values.driverId || undefined,
      vehicleId: values.vehicleId || undefined,
    };
    
    if (context.companyId && isNaN(context.companyId)) {
        toast({ title: "Invalid Input", description: "Company ID must be a number.", variant: "destructive" });
        return;
    }

    setResult(null);

    startTransition(async () => {
      const response = releaseId
        ? await evaluateRelease(appId, releaseId, context)
        : await evaluateContext(appId, context);

      if (response.error) {
        setResult({ type: "error", message: response.error });
      } else if (releaseId) { // Specific release evaluation
        const isAvailable = response.data;
        if (isAvailable) {
          setResult({ type: "success", message: "This release is available for the given context.", data: isAvailable });
        } else {
          setResult({ type: "info", message: "This release is NOT available for the given context.", data: isAvailable });
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
      return (
         <Alert variant={result.data ? "default" : "destructive"} className={result.data ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}>
            {result.data ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle>{result.data ? 'Available' : 'Not Available'}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
        </Alert>
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
                <FormItem>
                <FormLabel>Country</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="">Any Country</SelectItem>
                        {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                                {country.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Company ID</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 12345" {...field} disabled={isPending} />
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
                <FormLabel>Driver ID</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., driver-abc" {...field} disabled={isPending} />
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
                <FormLabel>Vehicle ID</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., vehicle-xyz" {...field} disabled={isPending} />
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
