// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { createTRPCRouter } from "../trpc";
import { organizationRouter } from "./governance/organization";
import { aiSystemRouter } from "./governance/aiSystem";
import { riskClassificationRouter } from "./governance/riskClassification";
import { transparencyRouter } from "./governance/transparency";
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
import { programRouter } from "./governance/program";
import { provenanceRouter } from "./governance/provenance";
import { obligationsRouter } from "./governance/obligations";
import { admtRouter } from "./governance/admt";
import { clientsRouter } from "./governance/clients";
import { billingRouter } from "./billing";
import { feedbackRouter } from "./feedback";
import { skillsRouter } from "./governance/skills";
import { aiRouter } from "./governance/ai";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  aiSystem: aiSystemRouter,
  riskClassification: riskClassificationRouter,
  transparency: transparencyRouter,
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
  program: programRouter,
  provenance: provenanceRouter,
  obligations: obligationsRouter,
  admt: admtRouter,
  clients: clientsRouter,
  billing: billingRouter,
  feedback: feedbackRouter,
  skills: skillsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
