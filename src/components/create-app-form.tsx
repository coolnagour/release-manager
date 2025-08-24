
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


const userSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  role: z.nativeEnum(Role),
});

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
  users: z.array(userSchema),
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
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: application?.name || "",
      packageName: application?.packageName || "",
      users: application?.users || (user?.email ? [{ email: user.email, role: Role.SUPERADMIN }] : []),
    },
  });

  const { fields, append, remove, update } = useFieldArray({
      control: form.control,
      name: "users",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email || !userProfile) {
        toast({
            title: "Authentication Error",
            description: "You must be logged in to modify an application.",
            variant: "destructive",
        });
        return;
    }
    
    startTransition(async () => {
      const result = isEditMode
        ? await updateApp(application.id, values, userProfile)
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
        if (fields.some(field => field.email === newUserEmail)) {
            toast({ title: "User already exists", description: "This email is already in the list.", variant: "destructive" });
        } else {
            append({ email: newUserEmail, role: Role.USER });
            setNewUserEmail("");
        }
    } else {
        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
    }
  }

  const handleRemoveUser = (index: number) => {
    const userToRemove = fields[index];
    if (userToRemove.email === user?.email) {
      toast({
        title: "Action Not Allowed",
        description: "You cannot remove yourself from the application.",
        variant: "destructive",
      });
      return;
    }
     if (userToRemove.role === Role.SUPERADMIN && userProfile?.roles?.[application!.id] !== Role.SUPERADMIN) {
        toast({
            title: "Action Not Allowed",
            description: "Admins cannot remove Super Admins.",
            variant: "destructive",
        });
        return;
    }
    remove(index);
  }

  const currentUserRole = userProfile?.roles?.[application?.id ?? ''];
  const canEditAppName = currentUserRole === Role.SUPERADMIN;
  const canEditUsers = currentUserRole === Role.SUPERADMIN || currentUserRole === Role.ADMIN;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 flex flex-col flex-1">
        <div className="flex-1">
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
                <FormItem className="mt-8">
                <FormLabel>Package Name</FormLabel>
                <FormControl>
                    <Input placeholder="com.example.app" {...field} disabled={isPending || (isEditMode && !canEditAppName)} />
                </FormControl>
                <FormDescription>
                    The unique identifier for your app (e.g., Android package name or iOS bundle ID).
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="users"
            render={() => (
                <FormItem className="mt-8">
                    <FormLabel>Users & Roles</FormLabel>
                    <FormDescription>
                        Manage who can access this application and what permissions they have.
                    </FormDescription>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {fields.map((field, index) => {
                                    const isSuperAdmin = field.role === Role.SUPERADMIN;
                                    const canCurrentUserEdit = currentUserRole === Role.SUPERADMIN || !isSuperAdmin;

                                    return (
                                        <div key={field.id} className="flex items-center justify-between gap-4">
                                            <span className="flex-1 truncate">{field.email}{isSuperAdmin && " (Owner)"}</span>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={field.role}
                                                    onValueChange={(newRole) => update(index, { ...field, role: newRole as Role })}
                                                    disabled={isPending || !canCurrentUserEdit || isSuperAdmin}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                                                        <SelectItem value={Role.USER}>User</SelectItem>
                                                        {isSuperAdmin && <SelectItem value={Role.SUPERADMIN}>Super Admin</SelectItem>}
                                                    </SelectContent>
                                                </Select>
                                                {!isSuperAdmin && (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveUser(index)} disabled={isPending || !canEditUsers}>
                                                        <Trash className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
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

            {canEditUsers && (
                <Card className="mt-8">
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
                                disabled={isPending}
                            />
                            <Button type="button" onClick={handleAddUser} disabled={isPending}>Add User</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        <div className="flex justify-end gap-2">
            <Button type="submit" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }} disabled={isPending || (isEditMode && !canEditAppName && !canEditUsers)}>
              {isPending ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Application")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
