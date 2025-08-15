
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createRelease } from "@/actions/release-actions";
import { useState, useTransition, useEffect } from "react";
import { Release, ReleaseStatus } from "@/types/release";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const formSchema = z.object({
  versionName: z.string().min(1, {
    message: "Version name must be at least 1 character.",
  }),
  versionCode: z.string().min(1, {
    message: "Version code must be at least 1 character.",
  }),
  status: z.nativeEnum(ReleaseStatus),
});

interface CreateReleaseFormProps {
    appId: string;
    onReleaseCreated: (newRelease: Release) => void;
    initialVersionCode?: string;
}

export function CreateReleaseForm({ appId, onReleaseCreated, initialVersionCode }: CreateReleaseFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      versionName: "",
      versionCode: initialVersionCode || "",
      status: ReleaseStatus.ACTIVE,
    },
  });

  useEffect(() => {
    if (initialVersionCode) {
      form.setValue("versionCode", initialVersionCode);
    }
  }, [initialVersionCode, form]);


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
        onReleaseCreated(result.data);
        form.reset();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            <FormItem>
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
            <FormItem>
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
        <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Release"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
