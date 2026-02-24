import { createTRPCRouter } from "../trpc";
import { organizationRouter } from "./governance/organization";
import { aiSystemRouter } from "./governance/aiSystem";
import { riskClassificationRouter } from "./governance/riskClassification";
import { assessmentRouter } from "./governance/assessment";
import { complianceRouter } from "./governance/compliance";
import { oversightRouter } from "./governance/oversight";
import { incidentRouter } from "./governance/incident";
import { vendorRouter } from "./governance/vendor";
import { policyRouter } from "./governance/policy";
import { shadowAiRouter } from "./governance/shadowAi";
import { vendorCatalogRouter } from "./governance/vendorCatalog";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  aiSystem: aiSystemRouter,
  riskClassification: riskClassificationRouter,
  assessment: assessmentRouter,
  compliance: complianceRouter,
  oversight: oversightRouter,
  incident: incidentRouter,
  vendor: vendorRouter,
  policy: policyRouter,
  shadowAi: shadowAiRouter,
  vendorCatalog: vendorCatalogRouter,
});

export type AppRouter = typeof appRouter;
