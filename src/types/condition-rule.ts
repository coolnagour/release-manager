
import { z } from 'zod';

export const conditionRuleSchema = z.object({
    countries: z.array(z.string()).default([]),
    companyIds: z.array(z.number().int()).default([]),
    driverIds: z.array(z.string()).default([]),
    vehicleIds: z.array(z.string()).default([]),
}).refine(data => !(data.driverIds.length > 0 && data.vehicleIds.length > 0), {
    message: "Driver IDs and Vehicle IDs cannot be used at the same time.",
    path: ["driverIds"],
});

export type ConditionRule = z.infer<typeof conditionRuleSchema>;
