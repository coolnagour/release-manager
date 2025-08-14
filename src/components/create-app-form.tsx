
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { createApp, updateApp } from "@/actions/app-actions";
import { useState, useTransition } from "react";
import { Application } from "@/types/application";
import { Role } from "@/types/roles";
import { Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
  allowedEmails: z.array(z.string().email({ message: "Invalid email address." })).min(1, {
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
  const [newUserEmail, setNewUserEmail] = useState("");

  const isEditMode = !!application;
  const isSuperAdmin = userProfile?.role === Role.SUPERADMIN;
  const isAdmin = userProfile?.role === Role.ADMIN;
  
  const canEditAppName = isSuperAdmin;
  const canEditAllowedEmails = isSuperAdmin || isAdmin;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: application?.name || "",
      packageName: application?.packageName || "",
      allowedEmails: application?.allowedEmails || [],
    },
  });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "allowedEmails",
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
        const transformedValues = {
            ...values,
            allowedEmails: values.allowedEmails.join(','),
        };
      const result = isEditMode
        ? await updateApp(application.id, transformedValues, user.email!)
        : await createApp(transformedValues, user.uid, user.email!);
        
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
        if (isEditMode) {
            router.refresh();
        } else {
            router.push("/");
            router.refresh();
        }
      }
    });
  }

  const handleAddUser = () => {
    const emailValidation = z.string().email().safeParse(newUserEmail);
    if (emailValidation.success) {
        if (fields.some(field => field.value === newUserEmail)) {
            toast({ title: "User already exists", description: "This email is already in the list.", variant: "destructive" });
        } else {
            append({ value: newUserEmail });
            setNewUserEmail("");
        }
    } else {
        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
    }
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
                <Input placeholder="My Awesome App" {...field} disabled={isPending || (isEditMode && !canEditAppName)} />
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
                <Input placeholder="com.example.app" {...field} disabled={isPending || isEditMode} />
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
          render={() => (
            <FormItem>
                <FormLabel>Users</FormLabel>
                <FormDescription>
                    These users can access and manage this application's releases.
                </FormDescription>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center justify-between">
                                    <span>{field.value}</span>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isPending || !canEditAllowedEmails}>
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                             {fields.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center">No users have been added yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                 <FormMessage />
            </FormItem>
          )}
        />

        {(isSuperAdmin || isAdmin) && (
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Add New User</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input 
                            type="email"
                            placeholder="user@example.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            disabled={isPending || !canEditAllowedEmails}
                        />
                        <Button type="button" onClick={handleAddUser} disabled={isPending || !canEditAllowedEmails}>Add User</Button>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }} disabled={isPending || (isEditMode && !canEditAppName && !canEditAllowedEmails)}>
              {isPending ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Application")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
    