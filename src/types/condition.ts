
import { z } from 'zod';
import { conditionRuleSchema } from './condition-rule';

export const conditionSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  rules: conditionRuleSchema,
});

export interface Condition extends z.infer<typeof conditionSchema> {
  id: string;
  applicationId: string;
  createdAt: Date;
}
