
import { z } from 'zod';

export const conditionSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  countries: z.array(z.string()).default([]),
  companies: z.array(z.number().int()).default([]),
  drivers: z.array(z.string()).default([]),
  vehicles: z.array(z.string()).default([]),
}).refine(data => !(data.drivers.length > 0 && data.vehicles.length > 0), {
  message: "Driver IDs and Vehicle IDs cannot be used at the same time.",
  path: ["drivers"],
});

export interface Condition extends z.infer<typeof conditionSchema> {
  id: string;
  applicationId: string;
  createdAt: Date;
}
