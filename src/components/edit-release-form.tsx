
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
import { updateRelease } from "@/actions/release-actions";
import { useTransition } from "react";
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

interface EditReleaseFormProps {
    appId: string;
    release: Release;
    conditions: Condition[];
    onReleaseUpdated?: (updatedRelease: Release) => void;
}

export function EditReleaseForm({ appId, release, conditions, onReleaseUpdated }: EditReleaseFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      versionName: release.versionName,
      versionCode: release.versionCode,
      status: release.status,
      conditionIds: release.conditionIds || [],
    },
  });

  const conditionOptions = conditions.map(c => ({ value: c.id, label: c.name }));

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await updateRelease(appId, release.id, values);
        
      if (result.error) {
        toast({
          title: `Error Updating Release`,
          description: result.error,
          variant: "destructive",
        });
      } else if (result.data) {
        toast({
          title: `Release Updated`,
          description: `${values.versionName} has been successfully updated.`,
        });
        if (onReleaseUpdated) {
            onReleaseUpdated(result.data)
        } else {
            router.push(`/app/${appId}/releases`);
            router.refresh();
        }
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
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
