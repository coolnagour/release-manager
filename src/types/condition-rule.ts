
import { z } from 'zod';

export const conditionRuleSchema = z.object({
    region: z.array(z.string()).default([]),
    companyId: z.array(z.number().int()).default([]),
    driverId: z.array(z.string()).default([]),
    vehicleId: z.array(z.string()).default([]),
});

export type ConditionRule = z.infer<typeof conditionRuleSchema>;
