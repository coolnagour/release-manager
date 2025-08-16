
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMemo } from "react";

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
import { createRelease } from "@/actions/release-actions";
import { useTransition, useEffect } from "react";
import { Release, ReleaseStatus } from "@/types/release";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useRouter } from "next/navigation";
import { Condition } from "@/types/condition";
import { MultiSelect } from "./ui/multi-select";

const formSchema = z.object({
  versionName: z.string().min(1, {
    message: "Version name must be at least 1 character.",
  }),
  versionCode: z.string().min(1, {
    message: "Version code must be at least 1 character.",
  }),
  status: z.nativeEnum(ReleaseStatus),
  conditionIds: z.array(z.string()).default([]),
});

interface CreateReleaseFormProps {
    appId: string;
    conditions: Condition[];
    onReleaseCreated?: (newRelease: Release) => void;
    initialVersionCode?: string;
}

export function CreateReleaseForm({ appId, conditions, onReleaseCreated, initialVersionCode }: CreateReleaseFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      versionName: "",
      versionCode: initialVersionCode || "",
      status: ReleaseStatus.ACTIVE,
      conditionIds: [],
    },
  });

  const { watch } = form;
  const selectedConditionIds = watch("conditionIds");

  const conditionsSummary = useMemo(() => {
    if (!selectedConditionIds || selectedConditionIds.length === 0) {
      return "This release will be available to all users.";
    }

    const selectedConditions = conditions.filter(c => selectedConditionIds.includes(c.id));
    
    const combinedRules = {
        countries: [...new Set(selectedConditions.flatMap(c => c.rules.countries || []))],
        companyIds: [...new Set(selectedConditions.flatMap(c => c.rules.companyIds || []))],
        driverIds: [...new Set(selectedConditions.flatMap(c => c.rules.driverIds || []))],
        vehicleIds: [...new Set(selectedConditions.flatMap(c => c.rules.vehicleIds || []))],
    };
    
    const descriptions = [];

    if (combinedRules.countries.length > 0) {
        descriptions.push(`in countries: ${combinedRules.countries.join(', ')}`);
    }

    if (combinedRules.companyIds.length > 0) {
        descriptions.push(`for companies: ${combinedRules.companyIds.join(', ')}`);
    }

    if (combinedRules.driverIds.length > 0) {
        descriptions.push(`for ${combinedRules.driverIds.length} specific drivers`);
    } else if (combinedRules.vehicleIds.length > 0) {
        descriptions.push(`for ${combinedRules.vehicleIds.length} specific vehicles`);
    }

    if(descriptions.length === 0) {
        return "This release will be available to all users (the selected conditions have no rules).";
    }

    return `This release will be available ${descriptions.join(', ')}.`;

  }, [selectedConditionIds, conditions]);

  useEffect(() => {
    if (initialVersionCode) {
      form.setValue("versionCode", initialVersionCode);
    }
  }, [initialVersionCode, form]);

  const conditionOptions = conditions.map(c => ({ value: c.id, label: c.name }));

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await createRelease(appId, values);
        
      if (result.error) {
        toast({
          title: `Error Creating Release`,
          description: result.error,
          variant: "destructive",
        });
      } else if (result.data) {
        toast({
          title: `Release Created`,
          description: `${values.versionName} has been successfully created.`,
        });
        
        if (onReleaseCreated) {
            onReleaseCreated(result.data);
        } else {
            router.push(`/app/${appId}/releases`);
            router.refresh();
        }
        form.reset();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col">
        <div className="flex-1">
          <FormField
            control={form.control}
            name="versionName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Version Name</FormLabel>
                <FormControl>
                  <Input placeholder="1.0.0" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="versionCode"
            render={({ field }) => (
              <FormItem className="mt-8">
                <FormLabel>Version Code</FormLabel>
                <FormControl>
                  <Input placeholder="1" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="mt-8">
                <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {Object.values(ReleaseStatus).map((status) => (
                              <SelectItem key={status} value={status} className="capitalize">
                                  {status}
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
              name="conditionIds"
              render={({ field }) => (
                <FormItem className="mt-8">
                  <FormLabel>Conditions</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={conditionOptions}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select conditions..."
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {conditionsSummary}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Release"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
