
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createApp, updateApp } from "@/actions/app-actions";
import { useState, useTransition } from "react";
import { Application } from "@/types/application";

const formSchema = z.object({
  appName: z.string().min(2, {
    message: "App name must be at least 2 characters.",
  }),
  packageName: z
    .string()
    .min(2, {
      message: "Package name must be at least 2 characters.",
    })
    .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i, {
      message: "Invalid package name format.",
    }),
  allowedEmails: z.string().min(1, {
    message: "Please enter at least one email address.",
  }),
});

interface CreateAppFormProps {
    application?: Application;
}

export function CreateAppForm({ application }: CreateAppFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [isPending, startTransition] = useTransition();

  const isEditMode = !!application;
  const canEditAll = userProfile?.role === 'superadmin';
  const canEditUsers = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: application?.name || "",
      packageName: application?.packageName || "",
      allowedEmails: application?.allowedEmails.join(", ") || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email) {
        toast({
            title: "Authentication Error",
            description: "You must be logged in to modify an application.",
            variant: "destructive",
        });
        return;
    }

    startTransition(async () => {
      const result = isEditMode
        ? await updateApp(application.id, values, user.email!)
        : await createApp(values, user.uid, user.email!);
        
      if (result.error) {
        toast({
          title: `Error ${isEditMode ? 'Updating' : 'Creating'} Application`,
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: `Application ${isEditMode ? 'Updated' : 'Created'}`,
          description: `${values.appName} has been successfully ${isEditMode ? 'updated' : 'created'}.`,
        });
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="appName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>App Name</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome App" {...field} disabled={isEditMode && !canEditAll} />
              </FormControl>
              <FormDescription>
                This is the public display name of your application.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="packageName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package Name</FormLabel>
              <FormControl>
                <Input placeholder="com.example.app" {...field} disabled={isEditMode} />
              </FormControl>
              <FormDescription>
                The unique identifier for your app (e.g., Android package name or iOS bundle ID). Cannot be changed after creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowedEmails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Emails</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="user1@example.com, user2@example.com"
                  {...field}
                  disabled={isEditMode && !canEditUsers}
                />
              </FormControl>
              <FormDescription>
                A comma-separated list of Google accounts that can manage this application.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }} disabled={isPending}>
              {isPending ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Application")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
