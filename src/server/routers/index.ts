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
import { userRouter } from "./user";
import { quickstartRouter } from "./governance/quickstart";
import { clientsRouter } from "./governance/clients";
import { expertsRouter } from "./governance/experts";
import { billingRouter } from "./billing";
import { feedbackRouter } from "./feedback";

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
  user: userRouter,
  quickstart: quickstartRouter,
  clients: clientsRouter,
  experts: expertsRouter,
  billing: billingRouter,
  feedback: feedbackRouter,
});

export type AppRouter = typeof appRouter;
