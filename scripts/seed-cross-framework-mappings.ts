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
    relationship: "equivalent",
    notes: "Both require transparency about AI system capabilities for deployers and users.",
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
    relationship: "equivalent",
    notes: "Both require accountability structures and human oversight mechanisms for AI systems.",
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
    a: "eu-art--15-4-",
    b: "nist-manage-4",
    relationship: "partial",
    notes: "EU AI Act focuses on cybersecurity measures; NIST requires documented risk treatments including security.",
  },
  {
    a: "eu-art--15-4-",
    b: "iso-8-3",
    relationship: "partial",
    notes: "Both address implementing risk treatment measures including cybersecurity controls.",
  },

  // ── Post-market / Incidents ──
  {
    a: "eu-art--61",
    b: "nist-measure-3",
    relationship: "equivalent",
    notes: "Both require ongoing monitoring and tracking of AI risks after deployment.",
  },
  {
    a: "eu-art--61",
    b: "iso-9-1",
    relationship: "equivalent",
    notes: "Both require post-deployment monitoring, measurement, and evaluation.",
  },
  {
    a: "eu-art--62",
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
    relationship: "equivalent",
    notes: "Both require assessing likelihood and impact of AI systems on individuals and groups.",
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
