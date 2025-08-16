
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
import { createCondition, updateCondition } from "@/actions/condition-actions";
import { useTransition } from "react";
import { Condition, conditionSchema } from "@/types/condition";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useRouter } from "next/navigation";
import { MultiSelect } from "./ui/multi-select";
import { countries } from "@/lib/countries";
import { TagInput } from "./ui/tag-input";

interface ConditionFormProps {
    appId: string;
    onConditionSubmitted?: () => void; // Optional now
    condition?: Condition | null;
}

const countryOptions = countries.map(country => ({
    value: country.code,
    label: country.name,
}));

// We keep the backend schema as is, but create a new form schema for the frontend
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  rules: z.object({
      country: z.array(z.string()),
      companyId: z.array(z.number()),
      driverId: z.array(z.string()),
      vehicleId: z.array(z.string()),
  })
});

type FormValues = z.infer<typeof formSchema>;

export function ConditionForm({ appId, onConditionSubmitted, condition }: ConditionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditMode = !!condition;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: condition?.name || "",
      rules: {
        country: condition?.rules.country || [],
        companyId: condition?.rules.companyId || [],
        driverId: condition?.rules.driverId || [],
        vehicleId: condition?.rules.vehicleId || [],
      },
    },
  });
  
  function onSubmit(values: FormValues) {
    startTransition(async () => {
      // We use the original conditionSchema to validate before sending to backend
      const backendValidation = conditionSchema.safeParse(values);
      if (!backendValidation.success) {
          toast({
              title: "Validation Error",
              description: backendValidation.error.errors.map(e => e.message).join(', '),
              variant: "destructive",
          });
          return;
      }
      
      const result = isEditMode
        ? await updateCondition(appId, condition.id, backendValidation.data)
        : await createCondition(appId, backendValidation.data);
        
      if (result.error) {
        toast({
          title: `Error ${isEditMode ? 'Updating' : 'Creating'} Condition`,
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: `Condition ${isEditMode ? 'Updated' : 'Created'}`,
          description: `${values.name} has been successfully ${isEditMode ? 'updated' : 'created'}.`,
        });
        if (onConditionSubmitted) {
          onConditionSubmitted();
        } else {
          router.push(`/app/${appId}/conditions`);
        }
        form.reset();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., EU Drivers" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Rules</CardTitle>
                <FormDescription>
                    Define rules to target specific user segments. Leave a field empty to include all users for that category.
                </FormDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                 <FormField
                    control={form.control}
                    name="rules.country"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                               <MultiSelect
                                    options={countryOptions}
                                    selected={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select countries..."
                                    disabled={isPending}
                               />
                            </FormControl>
                            <FormDescription>Select the countries to apply this condition to.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="rules.companyId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company IDs</FormLabel>
                            <FormControl>
                                <TagInput
                                    value={field.value.map(String)}
                                    onChange={(tags) => field.onChange(tags.map(Number).filter(n => !isNaN(n)))}
                                    placeholder="Enter a company ID and press Enter"
                                    disabled={isPending}
                                    inputType="number"
                                />
                            </FormControl>
                            <FormDescription>List of integer company IDs.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="rules.driverId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Driver IDs</FormLabel>
                            <FormControl>
                                <TagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Enter a driver ID and press Enter"
                                    disabled={isPending}
                                />
                            </FormControl>
                            <FormDescription>List of driver IDs.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="rules.vehicleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Vehicle IDs</FormLabel>
                            <FormControl>
                                <TagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Enter a vehicle ID and press Enter"
                                    disabled={isPending}
                                />
                            </FormControl>
                             <FormDescription>List of vehicle IDs.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Condition")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
