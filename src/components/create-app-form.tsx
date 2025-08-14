"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

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

export function CreateAppForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: "",
      packageName: "",
      allowedEmails: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // This is where you would handle the form submission, e.g., API call.
    console.log(values);

    toast({
      title: "Application Created",
      description: `${values.appName} has been successfully created.`,
    });

    // For this UI-only example, we'll navigate back to the home page.
    router.push("/");
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
                <Input placeholder="My Awesome App" {...field} />
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
                <Input placeholder="com.example.app" {...field} />
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
          name="allowedEmails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Emails</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="user1@example.com, user2@example.com"
                  {...field}
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
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>Create Application</Button>
        </div>
      </form>
    </Form>
  );
}
