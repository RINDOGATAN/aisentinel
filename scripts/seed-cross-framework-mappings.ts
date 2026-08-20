// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CrossMapping {
  a: string; // requirementA ID
  b: string; // requirementB ID
  relationship: "equivalent" | "partial" | "related";
  notes: string;
}

const crossMappings: CrossMapping[] = [
  // ── Risk Management ──
  {
    a: "eu-art--9",
    b: "nist-govern-1",
    relationship: "equivalent",
    notes: "Both require establishing risk management policies and processes for AI systems.",
  },
  {
    a: "eu-art--9",
    b: "iso-6-1",
    relationship: "equivalent",
    notes: "Both require actions to address risks throughout the AI system lifecycle.",
  },
  {
    a: "nist-govern-1",
    b: "iso-6-1",
    relationship: "equivalent",
    notes: "Both establish foundational risk management policies and procedures.",
  },
  {
    a: "eu-art--9-2-",
    b: "nist-map-4",
    relationship: "equivalent",
    notes: "Both require identification and analysis of known and foreseeable AI risks.",
  },
  {
    a: "eu-art--9-2-",
    b: "iso-6-1-2",
    relationship: "equivalent",
    notes: "Both require systematic AI risk assessment processes.",
  },
  {
    a: "eu-art--9-4-",
    b: "nist-manage-1",
    relationship: "equivalent",
    notes: "Both require prioritization and adoption of risk management measures.",
  },
  {
    a: "eu-art--9-4-",
    b: "iso-6-1-3",
    relationship: "equivalent",
    notes: "Both require implementing risk treatment measures.",
  },
  {
    a: "eu-art--9-5-",
    b: "nist-measure-1",
    relationship: "equivalent",
    notes: "Both require appropriate methods and metrics for testing AI risk levels.",
  },
  {
    a: "eu-art--9-5-",
    b: "iso-8-2",
    relationship: "equivalent",
    notes: "Both require performing risk assessments at planned intervals.",
  },

  // ── Data Governance ──
  {
    a: "eu-art--10",
    b: "nist-map-1",
    relationship: "partial",
    notes: "EU AI Act focuses on data governance; NIST MAP 1 on establishing intended context including data requirements.",
  },
  {
    a: "eu-art--10",
    b: "iso-8-1",
    relationship: "partial",
    notes: "Both address operational planning including data management practices.",
  },

  // ── Transparency ──
  {
    a: "eu-art--13",
    b: "nist-map-1",
    relationship: "partial",
    notes: "EU AI Act Art. 13 imposes specific transparency/instructions-for-use duties on providers; NIST MAP 1 is broader context-setting. Overlapping but not mutually satisfying.",
  },
  {
    a: "eu-art--13",
    b: "iso-7-4",
    relationship: "equivalent",
    notes: "Both require communication about AI system operations to relevant parties.",
  },
  {
    a: "eu-art--50",
    b: "iso-7-3",
    relationship: "partial",
    notes: "EU AI Act requires specific transparency obligations; ISO 42001 requires general awareness of AI policy.",
  },

  // ── Human Oversight ──
  {
    a: "eu-art--14",
    b: "nist-govern-2",
    relationship: "partial",
    notes: "EU AI Act Art. 14 requires design-level human oversight of high-risk systems; NIST GOVERN 2 addresses organizational accountability structures. Related duties, not equivalents.",
  },
  {
    a: "eu-art--14",
    b: "iso-5-3",
    relationship: "equivalent",
    notes: "Both require defining roles, responsibilities, and authorities for AI oversight.",
  },
  {
    a: "eu-art--14-3-",
    b: "nist-govern-3",
    relationship: "partial",
    notes: "EU AI Act requires understanding AI capabilities; NIST requires workforce AI expertise and diversity.",
  },
  {
    a: "eu-art--14-3-",
    b: "iso-7-2",
    relationship: "partial",
    notes: "Both address competence requirements for persons involved in AI oversight.",
  },

  // ── Documentation ──
  {
    a: "eu-art--11",
    b: "iso-7-5",
    relationship: "equivalent",
    notes: "Both require maintaining comprehensive documented information for AI systems.",
  },
  {
    a: "eu-art--12",
    b: "nist-measure-3",
    relationship: "equivalent",
    notes: "Both require tracking and logging mechanisms for AI system operations.",
  },
  {
    a: "eu-art--12",
    b: "iso-7-5",
    relationship: "equivalent",
    notes: "Both require record-keeping and documented information for traceability.",
  },

  // ── Accuracy / Performance ──
  {
    a: "eu-art--15",
    b: "nist-measure-2",
    relationship: "equivalent",
    notes: "Both require evaluation of AI system trustworthiness: accuracy, robustness, security.",
  },
  {
    a: "eu-art--15",
    b: "iso-9-1",
    relationship: "equivalent",
    notes: "Both require monitoring and measuring AI system performance characteristics.",
  },
  {
    a: "eu-art--15-5-",
    b: "nist-manage-4",
    relationship: "partial",
    notes: "EU AI Act Art. 15(5) focuses on cybersecurity measures; NIST requires documented risk treatments including security.",
  },
  {
    a: "eu-art--15-5-",
    b: "iso-8-3",
    relationship: "partial",
    notes: "Both address implementing risk treatment measures including cybersecurity controls.",
  },

  // ── Post-market / Incidents ──
  // Final-Act numbering: Art. 72 post-market monitoring, Art. 73 serious
  // incidents (61/62 were 2021-proposal numbers).
  {
    a: "eu-art--72",
    b: "nist-measure-3",
    relationship: "equivalent",
    notes: "Both require ongoing monitoring and tracking of AI risks after deployment.",
  },
  {
    a: "eu-art--72",
    b: "iso-9-1",
    relationship: "equivalent",
    notes: "Both require post-deployment monitoring, measurement, and evaluation.",
  },
  {
    a: "eu-art--73",
    b: "iso-10-2",
    relationship: "equivalent",
    notes: "Both require responding to incidents/nonconformities and implementing corrective actions.",
  },

  // ── Quality / Improvement ──
  {
    a: "eu-art--17",
    b: "iso-4-4",
    relationship: "equivalent",
    notes: "Both require establishing and maintaining a management system for AI quality.",
  },

  // ── Organizational Obligations ──
  {
    a: "eu-art--16",
    b: "iso-5-1",
    relationship: "partial",
    notes: "EU AI Act defines provider obligations; ISO 42001 requires leadership commitment to the AIMS.",
  },
  {
    a: "eu-art--26",
    b: "nist-govern-5",
    relationship: "partial",
    notes: "EU AI Act defines deployer obligations; NIST requires engagement processes with relevant AI actors.",
  },

  // ── Impact Assessment ──
  {
    a: "eu-art--27",
    b: "nist-map-5",
    relationship: "partial",
    notes: "EU AI Act Art. 27 mandates a formal fundamental rights impact assessment for certain deployers; NIST MAP 5 characterizes impacts generally. MAP 5 work informs, but does not satisfy, a FRIA.",
  },
  {
    a: "eu-art--27",
    b: "iso-6-1-4",
    relationship: "equivalent",
    notes: "Both require conducting impact assessments for AI systems on individuals and societies.",
  },
  {
    a: "nist-map-5",
    b: "iso-6-1-4",
    relationship: "equivalent",
    notes: "Both require assessing the potential impacts and likelihood of AI system risks.",
  },

  // ── Third-Party / Vendor ──
  {
    a: "eu-art--53",
    b: "nist-govern-6",
    relationship: "partial",
    notes: "EU AI Act addresses GPAI provider obligations; NIST addresses third-party risk policies.",
  },
  {
    a: "eu-art--53",
    b: "iso-4-2",
    relationship: "partial",
    notes: "Both address obligations and expectations regarding third-party/interested party AI systems.",
  },

  // ── NIST ↔ ISO direct mappings (no EU AI Act equivalent) ──
  {
    a: "nist-govern-4",
    b: "iso-5-2",
    relationship: "equivalent",
    notes: "Both address organizational risk tolerance and AI policy establishment.",
  },
  {
    a: "nist-manage-2",
    b: "iso-6-2",
    relationship: "equivalent",
    notes: "Both require planning AI objectives and strategies to maximize benefits.",
  },
  {
    a: "nist-measure-4",
    b: "iso-10-1",
    relationship: "equivalent",
    notes: "Both require feedback loops and continual improvement of AI management.",
  },
  {
    a: "nist-map-2",
    b: "iso-4-1",
    relationship: "partial",
    notes: "Both address understanding and categorizing the AI system within organizational context.",
  },
  {
    a: "nist-manage-3",
    b: "iso-8-4",
    relationship: "related",
    notes: "NIST focuses on third-party risk monitoring; ISO focuses on AI system impact assessment.",
  },
  // ══════════════════════════════════════════════════════════════════
  // California CCPA — ADMT / Risk Assessments / Cybersecurity Audits
  // ══════════════════════════════════════════════════════════════════
  // NOTE ON GRANULARITY: the NIST tree seeded here has only level-1 children
  // (GOVERN 1-6, MAP 1-5, MEASURE 1-4, MANAGE 1-4), and ISO/IEC 42001 Annex A
  // controls are not seeded at all. Where the natural counterpart is a NIST
  // subcategory, the mapping attaches to the nearest seeded ancestor and names
  // the intended subcategory in the notes, with the strength downgraded from
  // equivalent to partial where the parent does not carry the whole obligation.
  // Annex A mappings are omitted rather than forced onto a clause.
  //
  // GDPR GAP: §§ 7221(a) and 7222(b)(2) have their strongest analogues in GDPR
  // Art. 22(1)/(3) and Arts. 13(2)(f)/15(1)(h). No GDPR framework is seeded in
  // this product, so those links cannot exist as rows and are carried as prose
  // in the CA requirement descriptions instead. Do not fabricate a GDPR
  // framework to hold them; seeding one is a separate work item.

  // ── CA ↔ EU AI Act ──
  {
    a: "ca-7221-b-1",
    b: "eu-art--14",
    relationship: "partial",
    notes: "Both put a qualified human between the system and the outcome, but Art. 14 is a design-time oversight duty on the provider while § 7221(b)(1) is a run-time remedy for the consumer, requiring a named reviewer with authority to overturn.",
  },
  {
    a: "ca-7222-b-2",
    b: "eu-art--86",
    relationship: "equivalent",
    notes: "Both entitle the affected person to meaningful information about the logic of the decision; the CCPA text adds the parameters and the specific output explicitly.",
  },
  {
    a: "ca-7222-b-3",
    b: "eu-art--86",
    relationship: "equivalent",
    notes: "Both require explaining the role the system played in the decision procedure and the main elements of the decision taken.",
  },
  {
    a: "ca-7220",
    b: "eu-art--26",
    relationship: "partial",
    notes: "Both are pre-deployment notice duties on the deploying organization. Art. 26(7) is worker-specific and limited to Annex III high-risk systems; § 7220 covers all consumers across the five significant-decision domains.",
  },
  {
    a: "ca-7220-c-5-a",
    b: "eu-art--13",
    relationship: "partial",
    notes: "Art. 13 runs provider-to-deployer; § 7220(c)(5)(A) runs business-to-consumer. Both require explaining how the system processes inputs to reach an output.",
  },
  {
    a: "ca-7220-c-5-a",
    b: "eu-art--86",
    relationship: "partial",
    notes: "Art. 86 explains an individual decision after the fact; § 7220(c)(5)(A) explains the mechanism in advance.",
  },
  {
    a: "ca-7220",
    b: "eu-art--50",
    relationship: "related",
    notes: "Deliberately NOT equivalent. Art. 50 is about knowing you are interacting with AI or that content is synthetic; § 7220 is about the logic and consequences of a decision made about you.",
  },
  {
    a: "ca-7222",
    b: "eu-art--50",
    relationship: "related",
    notes: "Deliberately NOT equivalent, for the same reason as § 7220: Art. 50 concerns awareness of AI, not access to decision logic.",
  },
  {
    a: "ca-7150-b-3",
    b: "eu-art--27",
    relationship: "partial",
    notes: "Both are pre-deployment documented impact assessments. The FRIA is limited to Annex III deployers that are public bodies or provide public services, credit or insurance; § 7150(b)(3) is broader in trigger but privacy-centred rather than fundamental-rights-centred.",
  },
  {
    a: "ca-7152",
    b: "eu-art--27",
    relationship: "partial",
    notes: "Comparable documented content: affected categories, harms and mitigations. § 7156 expressly permits reusing an assessment prepared under another law if it is supplemented with whatever § 7152 requires and that law omits.",
  },
  {
    a: "ca-7152-a-5",
    b: "eu-art--10",
    relationship: "partial",
    notes: "§ 7152(a)(5) reaches discrimination on protected characteristics through the privacy-harm lens; Art. 10(2)(f)-(g) imposes direct data-governance duties to examine and mitigate bias.",
  },
  {
    a: "ca-7152-a-6",
    b: "eu-art--9",
    relationship: "partial",
    notes: "Both require documented safeguards proportionate to identified risk; Art. 9 is a continuous risk-management system, § 7152(a)(6) a safeguards record within one assessment.",
  },
  {
    a: "ca-7150-b-6",
    b: "eu-art--10",
    relationship: "partial",
    notes: "Both attach duties to the data used to train the system, though the CCPA trigger is the intention to train rather than the governance of the dataset itself.",
  },
  {
    a: "ca-7153",
    b: "eu-art--13",
    relationship: "partial",
    notes: "Structural analogue: § 7153 is the provider-to-deployer information duty narrowed to the facts the recipient needs for its own risk assessment.",
  },
  {
    a: "ca-7153",
    b: "eu-art--53-1--d-",
    relationship: "partial",
    notes: "Both oblige the party that trained the model to disclose facts about the training to those downstream, though Art. 53(1)(d) is a public summary and § 7153 is a business-to-business disclosure.",
  },
  {
    a: "ca-7155",
    b: "eu-art--9",
    relationship: "partial",
    notes: "Both make the assessment a living record: Art. 9(2) requires a continuous iterative process, § 7155 a three-yearly review plus a 45-day update on material change.",
  },
  {
    a: "ca-7155",
    b: "eu-art--72",
    relationship: "partial",
    notes: "Both require the deploying or providing organization to keep watching the system after go-live and to revisit its documentation when the picture changes.",
  },
  {
    a: "ca-7157",
    b: "eu-art--49",
    relationship: "partial",
    notes: "Both are regulator-facing filings. Art. 49 is a registration record in the EU database; § 7157 is an annual submission of counts plus an executive attestation under penalty of perjury.",
  },
  {
    a: "ca-7157",
    b: "eu-art--27",
    relationship: "partial",
    notes: "Art. 27(3) requires notifying the market surveillance authority of FRIA results; § 7157 requires an annual submission covering the assessments conducted.",
  },
  {
    a: "ca-7120-b",
    b: "eu-art--15",
    relationship: "related",
    notes: "Only loosely comparable, and deliberately not stronger: Art. 15 concerns the AI system's own accuracy, robustness and cybersecurity, whereas Article 9 CCPA is an enterprise information-security audit.",
  },

  // ── CA ↔ NIST AI RMF ──
  {
    a: "ca-7150",
    b: "nist-map-1",
    relationship: "equivalent",
    notes: "Both establish the context of the processing before it begins: purpose, participants, and the categories of people affected.",
  },
  {
    a: "ca-7152",
    b: "nist-map-5",
    relationship: "equivalent",
    notes: "Both require documenting the impacts of the system on individuals, groups and society, weighed against its benefits.",
  },
  {
    a: "ca-7152",
    b: "nist-measure-1",
    relationship: "partial",
    notes: "Intended counterpart is MEASURE 1.1 (methods selected and documented), which is not seeded as its own row; mapped to the MEASURE 1 parent and downgraded accordingly.",
  },
  {
    a: "ca-7221-b-2",
    b: "nist-measure-2",
    relationship: "partial",
    notes: "Intended counterparts are MEASURE 2.11 (fairness and bias evaluated) and MEASURE 2.5 (validity and reliability demonstrated), neither seeded as its own row. This is the operational core of the § 7221(b)(2) exception: claiming it requires evidence that the ADMT works for its purpose and does not unlawfully discriminate.",
  },
  {
    a: "ca-7152-a-6",
    b: "nist-manage-2",
    relationship: "partial",
    notes: "Intended counterpart is MANAGE 2.2; mapped to the MANAGE 2 parent. § 7152(a)(6) names policies, procedures and training against unlawful discrimination as a safeguard, which is what makes bias testing effectively mandatory documentation.",
  },
  {
    a: "ca-7151",
    b: "nist-govern-5",
    relationship: "equivalent",
    notes: "Both require stakeholder engagement to be built into the process rather than sought afterwards; § 7151 makes participation mandatory for employees whose duties include the processing.",
  },
  {
    a: "ca-7151",
    b: "nist-map-1",
    relationship: "partial",
    notes: "Intended counterpart is MAP 1.6 (stakeholder input in context-setting); mapped to the MAP 1 parent.",
  },
  {
    a: "ca-7152-a-9",
    b: "nist-govern-2",
    relationship: "equivalent",
    notes: "Both require named accountability: § 7152(a)(9) demands the names and positions of reviewers and approvers, and that an approver hold authority over the go/no-go decision.",
  },
  {
    a: "ca-7157-a-d",
    b: "nist-govern-2",
    relationship: "equivalent",
    notes: "Both place accountability with named executive management; the CCPA submission must be signed by an executive directly responsible for compliance.",
  },
  {
    a: "ca-7124",
    b: "nist-govern-2",
    relationship: "equivalent",
    notes: "Both require an accountable executive to stand behind the result; the § 7124 attestation adds an affirmative statement that the business did not attempt to influence the auditor.",
  },
  {
    a: "ca-7155",
    b: "nist-manage-4",
    relationship: "partial",
    notes: "Intended counterparts are MANAGE 4.1-4.3 (post-deployment monitoring and continual improvement); mapped to the MANAGE 4 parent.",
  },
  {
    a: "ca-7155",
    b: "nist-govern-1",
    relationship: "partial",
    notes: "Intended counterpart is GOVERN 1.5 (periodic review and continual improvement); mapped to the GOVERN 1 parent.",
  },
  {
    a: "ca-7001-e-1",
    b: "nist-govern-3",
    relationship: "partial",
    notes: "Intended counterpart is GOVERN 3.2 (policies for human-AI configurations and oversight roles); mapped to the GOVERN 3 parent. § 7001(e)(1) is the conjunctive test that decides whether a human is genuinely in the loop.",
  },
  {
    a: "ca-7221-b-1",
    b: "nist-manage-2",
    relationship: "partial",
    notes: "Intended counterpart is MANAGE 2.1 (mechanisms to supersede or disengage); mapped to the MANAGE 2 parent.",
  },
  {
    a: "ca-7153",
    b: "nist-govern-6",
    relationship: "partial",
    notes: "Both govern the supply chain: § 7153 obliges the party supplying the ADMT to hand over the facts the recipient needs for its own assessment.",
  },
  {
    a: "ca-7153",
    b: "nist-map-4",
    relationship: "partial",
    notes: "Intended counterpart is MAP 4.1 (third-party risks mapped); mapped to the MAP 4 parent.",
  },
  {
    a: "ca-7123",
    b: "nist-manage-2",
    relationship: "partial",
    notes: "Both address the security and resilience of the system in operation, though Article 9 CCPA audits the enterprise programme rather than the model.",
  },
  {
    a: "ca-7123-f",
    b: "nist-measure-2",
    relationship: "partial",
    notes: "§ 7123(f) expressly names the NIST Cybersecurity Framework 2.0 as a reusable basis for the cybersecurity audit, so an existing CSF programme can be supplemented rather than replaced.",
  },

  // ── CA ↔ ISO/IEC 42001 ──
  // Annex A control mappings are deliberately omitted: Annex A is not seeded,
  // and forcing an Annex A control onto a management-system clause would be a
  // content error rather than an approximation.
  {
    a: "ca-7151",
    b: "iso-4-2",
    relationship: "partial",
    notes: "Both concern interested parties, from different angles: clause 4.2 identifies their needs and expectations, § 7151 mandates who must actually participate in the assessment.",
  },
  {
    a: "ca-7152",
    b: "iso-6-1",
    relationship: "partial",
    notes: "Both are the documented output of planning to address risks and opportunities before the activity proceeds.",
  },
  {
    a: "ca-7155",
    b: "iso-9-3",
    relationship: "partial",
    notes: "Both require periodic management review of whether the assessment still reflects reality.",
  },
  {
    a: "ca-7155",
    b: "iso-10",
    relationship: "partial",
    notes: "Both require the record to be updated when circumstances change; § 7155 puts a 45-day clock on material changes.",
  },
  {
    a: "ca-7157-a-d",
    b: "iso-5-3",
    relationship: "partial",
    notes: "Both assign explicit organizational roles, responsibilities and authorities; the CCPA submission names an executive with authority to attest.",
  },
  {
    a: "ca-7124",
    b: "iso-5-3",
    relationship: "partial",
    notes: "Both require a defined, authorised role to sign off; § 7124 requires that person to attest under penalty of perjury.",
  },
];

async function main() {
  console.log("Seeding cross-framework mappings...\n");

  let created = 0;
  let skipped = 0;

  for (const mapping of crossMappings) {
    // Verify both requirements exist
    const [reqA, reqB] = await Promise.all([
      prisma.complianceRequirement.findUnique({ where: { id: mapping.a } }),
      prisma.complianceRequirement.findUnique({ where: { id: mapping.b } }),
    ]);

    if (!reqA) {
      console.warn(`  SKIP: Requirement A not found: ${mapping.a}`);
      skipped++;
      continue;
    }
    if (!reqB) {
      console.warn(`  SKIP: Requirement B not found: ${mapping.b}`);
      skipped++;
      continue;
    }

    await prisma.crossFrameworkMapping.upsert({
      where: {
        requirementAId_requirementBId: {
          requirementAId: mapping.a,
          requirementBId: mapping.b,
        },
      },
      update: {
        relationship: mapping.relationship,
        notes: mapping.notes,
      },
      create: {
        requirementAId: mapping.a,
        requirementBId: mapping.b,
        relationship: mapping.relationship,
        notes: mapping.notes,
      },
    });
    created++;
  }

  console.log(`Created ${created} cross-framework mappings (${skipped} skipped)`);

  // A skipped mapping is a silent content bug: the target requirement code does
  // not exist in the seeded framework, so the cross-reference simply vanishes.
  // CI and the release checklist run this with --strict so that fails loudly.
  if (skipped > 0 && process.argv.includes("--strict")) {
    console.error(
      `\nFAIL (--strict): ${skipped} cross-mapping target(s) unresolved. ` +
        `Fix the requirement codes above, or seed the missing requirements first.`,
    );
    process.exit(1);
  }

  // Reconcile: drop rows this config no longer asserts.
  //
  // cross_framework_mappings is pure catalog — no organizationId, no
  // user-editable fields, and the app only ever reads it — so this array is its
  // complete source of truth. Upserting alone is not enough: when a mapping is
  // re-pointed (as happened when the EU AI Act corrections moved cybersecurity
  // from Art. 15(4) to Art. 15(5)), the upsert writes the new pair and the
  // superseded one lingers forever on every database seeded before the fix.
  // A fresh install would then disagree with an upgraded one — divergence in
  // legal citations, which is the one place it is least acceptable.
  //
  // Refused when anything was skipped: an unresolved target means the framework
  // seeds have not run yet, and pruning against a half-loaded picture would
  // delete valid rows.
  if (skipped === 0) {
    const asserted = new Set(crossMappings.map((m) => `${m.a}|${m.b}`));
    const existing = await prisma.crossFrameworkMapping.findMany({
      select: { id: true, requirementAId: true, requirementBId: true },
    });
    const stale = existing.filter((r) => !asserted.has(`${r.requirementAId}|${r.requirementBId}`));
    if (stale.length > 0) {
      for (const row of stale) {
        console.log(`  PRUNE (no longer asserted): ${row.requirementAId} -> ${row.requirementBId}`);
      }
      await prisma.crossFrameworkMapping.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
      console.log(`Pruned ${stale.length} superseded cross-framework mapping(s).`);
    }
  } else {
    console.warn("Skipping reconciliation: unresolved targets mean the asserted set is incomplete.");
  }
  console.log("\nBreakdown:");
  const equivalent = crossMappings.filter((m) => m.relationship === "equivalent").length;
  const partial = crossMappings.filter((m) => m.relationship === "partial").length;
  const related = crossMappings.filter((m) => m.relationship === "related").length;
  console.log(`  - Equivalent: ${equivalent}`);
  console.log(`  - Partial: ${partial}`);
  console.log(`  - Related: ${related}`);
}

main()
  .catch((e) => {
    console.error("Error seeding cross-framework mappings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
