import { createTRPCRouter } from "../trpc";
import { organizationRouter } from "./governance/organization";
import { aiSystemRouter } from "./governance/aiSystem";
import { riskClassificationRouter } from "./governance/riskClassification";
import { assessmentRouter } from "./governance/assessment";
import { complianceRouter } from "./governance/compliance";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  aiSystem: aiSystemRouter,
  riskClassification: riskClassificationRouter,
  assessment: assessmentRouter,
  compliance: complianceRouter,
});

export type AppRouter = typeof appRouter;
