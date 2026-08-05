# AI-governance landscape, August 2026 — delta report + product strategy for AI SENTINEL

**Retrieval date for all sources: 2026-08-05.** Companion to
`ai-governance-landscape-2026-07.md` (retrieved 2026-07-17); this report covers the delta
since then — including what actually happened on **2 Aug 2026**, the regime's biggest
applicability date — plus two new research threads: the commercial platform landscape and
the state of the art in AI compliance documentation artifacts. Method: three parallel
research agents over primary sources where possible. Confidence tags as before:
**[P]** primary source fetched · **[S]** secondary (law firm / trade press / vendor) ·
**[U]** unconfirmed.

**Headlines:** (1) The Digital Omnibus is now **Regulation (EU) 2026/1744** (OJ 24 Jul 2026,
in force 27 Jul 2026) — the citation that unblocks finalizing our seeded legal content.
(2) **Art. 50 transparency and Commission GPAI enforcement went live 2 Aug 2026**, with
final Commission guidelines (20 Jul) and an adequacy-blessed Transparency Code of Practice
(~190 signatories). (3) Gartner published its **first Magic Quadrant for AI Governance
Platforms** (Jun 2026) — and the survey shows the deep EU AI Act artifacts AI Sentinel is
built around remain rare across the field, while sovereignty/self-host is offered by almost
nobody. That combination defines the product strategy at the end of this report.

---

## 1. Regulatory delta since 2026-07-17

- **1.1 Digital Omnibus published: Regulation (EU) 2026/1744 [P].** Full title: Regulation
  amending Regulations (EU) 2024/1689, (EU) 2018/1139 and (EU) 2023/1230 (Digital Omnibus
  on AI), of 8 Jul 2026. Published OJ L 2026/1744 on **24 Jul 2026**; **in force 27 Jul
  2026**. EUR-Lex-verified: Annex III standalone high-risk → **2 Dec 2027**; Annex I /
  Art. 6(1) → **2 Aug 2028**; new Art. 5(1)(ba) (non-consensual intimate imagery) and
  5(1)(bb) (AI CSAM) prohibitions from 2 Dec 2026. Recital 41 replaces the Art. 50
  implementing-act empowerment for transparency codes with the adequacy-opinion mechanism.
  <https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng>
  **Seed action: replace every "OJ publication pending" caveat with the 2026/1744 citation.**
- **1.2 Art. 50 went live 2 Aug 2026 with final guidance [P].** Final "Guidelines on
  transparency obligations for providers and deployers of certain AI systems" adopted
  **20 Jul 2026** (+ Commission FAQ): chatbot disclosure by design, deployer deepfake
  labeling even without deceptive intent (artistic/satirical reduced-labeling read
  narrowly), machine-readable marking of synthetic content, emotion-recognition /
  biometric-categorization disclosure, AI-generated public-interest text.
  <https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content> ·
  <https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act>
- **1.3 Transparency Code of Practice assessed adequate; ~190 signatories [P].** Commission
  opinion 8 Jul + AI Board 9 Jul 2026: CoP adequate for Art. 50(2)/(4)/(5). As of 31 Jul
  2026: Section 1 (generative-AI providers/marking solutions) **82 signatories** incl.
  Anthropic, Google, **Meta**, Microsoft, Mistral, OpenAI, Synthesia; Section 2 (deployers)
  **152** incl. Getty, Lufthansa, Iberdrola.
  <https://digital-strategy.ec.europa.eu/en/news/strong-backing-code-practice-transparency-ai-generated-content>
  **Product hook: CoP signatory status (Section 1/2) is a vendor-catalog field for the
  vendor.watch contract.**
- **1.4 Art. 50 transitional dates [S — VERIFY vs 2026/1744 text before seeding].**
  Machine-readable-marking grace for generative systems on the market before 2 Aug 2026 →
  **2 Dec 2026**; interoperable watermark-detection solution required by **2 Feb 2027**
  (Reed Smith reading of the final Omnibus; not independently verified on EUR-Lex).
- **1.5 GPAI enforcement powers live 2 Aug 2026 [S, convergent].** Commission/AI Office may
  investigate, request documentation, run model evaluations, order corrective measures,
  fine up to 3 %/€15M (Art. 101). **No first enforcement action found as of 2026-08-05**
  (3 days in — negative finding). MSA readiness still patchy (~9–10 of 27 fully designated).
- **1.6 EN 18286:2026 published — first AI Act harmonised standard [S].** CEN-CENELEC
  approved 12 Jul 2026, published late Jul (Art. 17 QMS for high-risk providers). **NOT yet
  cited in the OJ → still no Art. 40 presumption of conformity.** Keep the product's "no
  presumption yet" note; update the standards-tracker row.
- **1.7 EU high-risk database (Art. 71) delayed to ~Q3 2027 [S].** Not operational; Service
  Desk position: registration duty begins Dec 2027 (commentators dispute whether Art. 49
  was textually deferred — [U], don't take a position in product copy).
- **1.8 Spain: PLOIA is a BILL, not law [P].** Proyecto de Ley Orgánica (121/000096)
  published BOCG A-97-1 on 12 Jun 2026; amendment period closed 30 Jun; in Economy/Digital
  committee; organic-law absolute majority required. **Not in the BOE, not in force.** Keep
  ES-locale copy conditional. AESIA: 16 compliance guides (Feb 2026); new sandbox calls
  await the PLOIA. <https://www.congreso.es/public_oficiales/L15/CONG/BOCG/A/BOCG-15-A-97-1.PDF>
- **1.9 EDPB draft Guidelines 02/2026 (anonymisation) + 03/2026 (web scraping for AI
  training)** adopted 8 Jul 2026; consultation to 30 Oct 2026 [S].
- **1.10 Still NOT final/published (all negative, verified by search):** Art. 6(5)
  high-risk classification guidelines (draft 19 May 2026; consultation closed 23 Jul);
  Art. 73 incident guidance/template (draft 26 Sep 2025); **Art. 27(5) FRIA template**;
  Art. 11 simplified technical-documentation form for SMEs; any OJ citation of a
  harmonised standard.

## 2. Platform landscape (mid-2026)

- **2.1 First Gartner MQ for AI Governance Platforms (16–17 Jun 2026) [S over paywalled P].**
  13 vendors. Leaders: IBM, ServiceNow, Truyo. Visionaries: Airia, Credo AI, ModelOp,
  Monitaur, OneTrust. Challenger: Holistic AI. Niche: Cranium, Relyance, Saidot, SAP.
  Market $65M (2024) → $1.4B (2030) projected. Forrester Wave Q3 2025 leaders: Credo AI,
  IBM. Consolidation: FairNow→AuditBoard ("Optro"), Lakera→Check Point, Robust
  Intelligence→Cisco; Zenity $125M C (3 Aug 2026).
- **2.2 The deep EU AI Act artifacts are RARE — this is the strategic finding.** Named
  FRIA workflows: **Modulos, Saidot only**. Annex IV tech-doc generation from connected
  sources: **Modulos, trail** (Saidot captures; Vanta/Trustible assemble; IBM/Microsoft/
  OneTrust/ServiceNow: nothing). Art. 50 tracking: **Modulos, Saidot only**. EU-database
  registration tracking: **Saidot only**. Art. 4 literacy tracking: **Modulos only**.
  Conformity + CE-marking prep: Modulos, Credo, Saidot, trail. Risk-tier classification
  wizards, by contrast, are table stakes (IBM, Vanta, Trustible, Modulos, Credo, Dastra,
  OneTrust, ServiceNow).
- **2.3 Discovery: manual-only registry intake now reads as legacy.** Four architectures:
  ML-platform connectors (OneTrust: Bedrock/SageMaker/Foundry/Databricks/Vertex, Mar 2026;
  Credo 30 integrations; ServiceNow 30+); provider-admin-API sync (Vanta ↔ OpenAI +
  Anthropic admin APIs); endpoint/network telemetry (Drata Sensor 4 Aug 2026 incl. local
  models; Purview DSPM; Defender 1,000+ GenAI app catalog); and best-practice correlation
  (SSO + OAuth grants + browser + expense mining). Workflow-first vendors targeting
  legal/compliance buyers (Trustible, Naaia, Dastra) deliberately stay manual — AI
  Sentinel's cohort.
- **2.4 "AI CCM" at the compliance-automation vendors is mostly access governance.**
  Vanta/Drata automated tests verify AI-provider accounts belong to active employees, get
  deprovisioned, configs are sane — not model behavior. Genuine eval→evidence pipelines
  exist only at Microsoft Foundry ↔ Credo/Saidot/Compliance Manager and IBM's factsheet
  chain. Eval vendors are being absorbed by security vendors, not governance platforms.
- **2.5 Agent governance was the year's universal ship.** Credo Agent Registry + Agent
  Cards + Agent Governor; Holistic AI Guardian Agents; Saidot Agent Catalogue (autonomy
  levels, tool-level risk, MCP connectivity); Drata AI Agent Governance (MCP proxy with
  inline policy enforcement, 4 Aug 2026); OneTrust MCP policy enforcement; ServiceNow ↔
  Agent 365; **Microsoft Entra Agent ID GA Apr 2026** (agents as directory objects with
  human sponsors); Databricks Unity AI Gateway (Contextual Service Policies over models/
  agents/MCP services); MCP donated to Linux Foundation (Dec 2025); OWASP Agentic Top 10
  (Dec 2025). Gartner: 150K+ agents per Fortune 500 by 2028 [U, third-hand].
- **2.6 Sovereignty is near-empty territory.** Self-host/on-prem: Naaia, Modulos (hybrid),
  Giskard, and OSS **VerifyWise** (the most complete open-source governance platform — EU
  AI Act templates, ISO 42001/NIST mappings, model inventory, LLM-eval module; the OSS
  competitor to watch). None of the funded US players emphasize it.
- **2.7 Trust centers / public AI transparency: white space.** Only Saidot ships one-click
  transparency reports from live governance data; Warden AI's embedded bias-audit badges
  work as a model. No one ships public AI system-card publishing. (Frontier system cards
  themselves are unstandardized — 947 unique section names across studied cards.)
- **2.8 Pricing/packaging:** custom-quoted platform + framework "policy packs" as add-ons;
  Vanta/Drata AI frameworks ~$5–15K/yr add-ons; OneTrust ~$50K entry; dedicated EU
  platforms ~€30–50K/yr [all 3P estimates]. Governance spend now 8–12 % of enterprise AI
  budgets [3P]. Buyers split: security/GRC-led vs legal/compliance-led vs ML-platform-led.

## 3. Documentation artifacts (state of the art)

- **3.1 System cards are now book-length safety dossiers** organized around capability
  thresholds (Anthropic RSP/FCF determinations; OpenAI Preparedness thresholds + rolling
  "Deployment Safety Hub" with delta-cards). **No machine-readable model-card schema has
  won** — HF YAML frontmatter is the de facto layer; ISO/IEC 12792:2025 (transparency
  taxonomy, Nov 2025) is taxonomy-level only [P].
- **3.2 Annex IV practice: no Commission worked example, no Art. 11 simplified form**
  (negative, confirmed) — the template market is law-firm/vendor artifacts. SMEs "may
  document in simplified manner" but must build against the full 9-section structure.
- **3.3 Training-data summaries (Art. 53(1)(d)): minority practice.** Only 5 public
  summaries as of Jan 2026 (FAccT study); ~11 models from 7 providers on the template by
  mid-2026 [U on the provider list]; AI Office verification powers live since 2 Aug 2026.
  Catalog field candidate: "training-data summary published (template/prose/none)".
- **3.4 AI BOM got real regulatory pull:** **CISA + G7 partners (incl. EU) "SBOM for AI —
  Minimum Elements" (Jun 2026)** and the 2026 SBOM Minimum Elements (29 Jul 2026)
  extending scope to AI [P]. Format split: CycloneDX ML-BOM (v1.7) internally, SPDX 3.0 AI
  profile for vendor/regulatory filings. Appearing in procurement language; catalog field
  candidate: "AI BOM available (format)".
- **3.5 Eval reporting: the GPAI Code of Practice created the first quasi-regulatory eval
  genre** (Safety & Security Frameworks + Model Reports filed to the AI Office via SEND;
  26 signatories). Inspect (UK AISI) is the de facto harness. **No standardized public AI
  audit-report format exists** (ISO 42006-accredited cert audits are private, ISO 17021
  conventions; ~100 ISO 42001-certified orgs by Jan 2026).
- **3.6 ISO/IEC 42005 is the reference impact-assessment scaffold** (Annex E template),
  positioned under a FRIA and on top of a DPIA. With no official FRIA template (1.10),
  APDCAT per-right 4×4 + 42005 Annex E remains the best-practice synthesis — the FRIA v2
  design target.
- **3.7 Art. 50 marking stack in practice: C2PA manifests + SynthID-style invisible
  watermark ("two-layer") + generation logging.** C2PA >6,000 members; SynthID >100B items,
  adopted beyond Google. Compliance documentation in practice = a **marking-methods
  statement** mapping output types to techniques — a generatable artifact, no standard form.
- **3.8 Procurement/vendor DD norms:** CSA **AI Controls Matrix + AI-CAIQ** (243 controls,
  mapped to ISO 42001 + EU AI Act) is the closest CAIQ-for-AI; **EU MCC-AI model
  contractual clauses** (updated Mar 2025, high-risk + light versions) the reference AI
  addendum; subprocessor norms now explicitly cover model providers
  (disclosure-with-short-notice — Microsoft cut AI-subprocessor notice to 30 days). No
  ratified private-sector AI-addendum standard (negative).

## 4. Seed-content audit (delta)

| Item | Action |
|---|---|
| "OJ publication pending" caveats | Replace with **Regulation (EU) 2026/1744**, OJ 24 Jul 2026, in force 27 Jul 2026; bump `lawReviewedAsOf` |
| Art. 50 rows | Cite final guidelines (20 Jul 2026) + Commission FAQ; add CoP-adequacy note; add marking-grace (2 Dec 2026) and interop (2 Feb 2027) dates **after verifying vs 2026/1744 text** |
| Standards tracker | EN 18286:2026 published, NOT OJ-cited → keep "no presumption of conformity yet" |
| EU database rows | Not operational; ~Q3 2027 [S]; registration-duty timing disputed — stay neutral |
| Spain / ES locale | PLOIA = bill in committee (121/000096); keep €35M/7 % deepfake-fine copy conditional |
| Art. 6(5), Art. 73, FRIA template | All still draft/absent — existing "draft" annotations stay correct |

## 5. Product strategy

**Positioning.** AI Sentinel's competitive set is Modulos / Saidot / trail / Naaia — the
EU artifact-depth cohort — not the CCM players. The rare/differentiating list in §2.2 is
nearly congruent with AI Sentinel's existing module map (FRIA, conformity, Annex IV
drafting, cross-framework mappings), and sovereignty (AGPL, self-host, local LLM gateway,
EN/ES) is offered by almost no one. Double down on artifact depth + deadline intelligence
+ sovereignty; don't chase integrations or runtime enforcement.

**Prioritized build list:**

| # | Priority driver | Item |
|---|---|---|
| 1 | Now — credibility floor | Finalize seeds per §4 (2026/1744 citation, final Art. 50 guidance, EN 18286, Spain status); re-seed hosted |
| 2 | Live obligation, ~2 competitors | **Art. 50 transparency module**: per-system profile (chatbot / deepfake / marking / emotion-recognition), deadline ladder (2 Dec 2026 grace, 2 Feb 2027 interop), AI-drafted marking-methods statement; Transparency-CoP signatory field via vendor.watch |
| 3 | Post-Omnibus confusion = demand | **Obligation timeline engine**: deterministic dated obligation schedule per system from classification/role/GPAI flags; org compliance calendar on the executive dashboard |
| 4 | 2026's universal theme | **Agent governance in the registry**: agents first-class (autonomy level, tools/MCP servers, human sponsor, kill-switch documentation, oversight-gate links); agentic vendor-catalog fields |
| 5 | Unique data asset, already shipped | **Subprocessor supply-chain view**: vendor supply-chain tab + org-level dependency rollup from the enriched catalog (`catalogVendorSlug` links); MCC-AI / AI-CAIQ-aligned vendor-assessment template |
| 6 | Live GPAI regime | **Dual incident-deadline ladders**: Art. 3(49) type picker → Art. 73 15/10/2 vs GPAI CoP 2/5/10/15; Commission GPAI template as PDF export |
| 7 | No official template = open field | **FRIA v2 premium assessment skill**: APDCAT per-right 4×4 likelihood×severity + ISO 42005 Annex E structure; ships via the assessment installer |
| 8 | White space, most speculative | Public AI transparency page / system-card publishing per org |

**Deliberately not pursuing:** runtime MCP/guardrail enforcement, integration-heavy
continuous monitoring, eval harnesses — different buyer, different moat.

**Catalog-field pipeline for vendor.watch** (cross-app contract, coordinate there):
Transparency-CoP signatory (Section 1/2) · GPAI CoP signatory · training-data summary
status (template/prose/none) · AI BOM availability (CycloneDX/SPDX) · agentic capabilities.

**Caveats:** (i) Art. 50 transitional sub-dates are [S] — verify against the 2026/1744
text before seeding; (ii) Gartner MQ detail is from secondary write-ups of a paywalled
report; (iii) pricing figures are third-party estimates; (iv) items tagged [U] must not
appear in product copy.
