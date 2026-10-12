# AI-governance landscape, August 2026 — delta report for AI SENTINEL

**Retrieval date for all sources: 2026-08-05.** Companion to
`ai-governance-landscape-2026-07.md` (retrieved 2026-07-17); this report covers the delta
since then — including what actually happened on **2 Aug 2026**, the regime's biggest
applicability date — plus a new research thread: the state of the art in AI compliance
documentation artifacts. Method: parallel
research agents over primary sources where possible. Confidence tags as before:
**[P]** primary source fetched · **[S]** secondary (law firm / trade press / vendor) ·
**[U]** unconfirmed.

**Headlines:** (1) The Digital Omnibus is now **Regulation (EU) 2026/1744** (OJ 24 Jul 2026,
in force 27 Jul 2026) — the citation that unblocks finalizing our seeded legal content.
(2) **Art. 50 transparency and Commission GPAI enforcement went live 2 Aug 2026**, with
final Commission guidelines (20 Jul) and an adequacy-blessed Transparency Code of Practice
(~190 signatories).

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
  **Checked 2026-09-16 against the official text:** the 2 Dec 2026 date is right
  (Art. 111(4), inserted by 2026/1744). The 2 Feb 2027 watermark-detection
  deadline is NOT in the text: **unsupported, do not seed or cite it**
  (`src/config/eu-ai-act-dates.ts`, `UNSUPPORTED_EU_AI_ACT_DATES`).
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

## 2. Documentation artifacts (state of the art)

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

## 3. Seed-content audit (delta)

| Item | Action |
|---|---|
| "OJ publication pending" caveats | Replace with **Regulation (EU) 2026/1744**, OJ 24 Jul 2026, in force 27 Jul 2026; bump `lawReviewedAsOf` |
| Art. 50 rows | Cite final guidelines (20 Jul 2026) + Commission FAQ; add CoP-adequacy note; add marking-grace (2 Dec 2026) and interop (2 Feb 2027) dates **after verifying vs 2026/1744 text** (checked 2026-09-16: 2 Dec 2026 confirmed, 2 Feb 2027 unsupported, see 1.4) |
| Standards tracker | EN 18286:2026 published, NOT OJ-cited → keep "no presumption of conformity yet" |
| EU database rows | Not operational; ~Q3 2027 [S]; registration-duty timing disputed — stay neutral |
| Spain / ES locale | PLOIA = bill in committee (121/000096); keep €35M/7 % deepfake-fine copy conditional |
| Art. 6(5), Art. 73, FRIA template | All still draft/absent — existing "draft" annotations stay correct |

## 4. Build list

| # | Item |
|---|---|
| 1 | Finalize seeds per §3 (2026/1744 citation, final Art. 50 guidance, EN 18286, Spain status); re-seed hosted |
| 2 | **Art. 50 transparency module**: per-system profile (chatbot / deepfake / marking / emotion-recognition), deadline ladder (2 Dec 2026 grace; the 2 Feb 2027 interop date is unsupported, see 1.4), AI-drafted marking-methods statement; Transparency-CoP signatory field via vendor.watch |
| 3 | **Obligation timeline engine**: deterministic dated obligation schedule per system from classification/role/GPAI flags; org compliance calendar on the executive dashboard |
| 4 | **Agent governance in the registry**: agents first-class (autonomy level, tools/MCP servers, human sponsor, kill-switch documentation, oversight-gate links); agentic vendor-catalog fields |
| 5 | **Subprocessor supply-chain view**: vendor supply-chain tab + org-level dependency rollup from the enriched catalog (`catalogVendorSlug` links); MCC-AI / AI-CAIQ-aligned vendor-assessment template |
| 6 | **Dual incident-deadline ladders**: Art. 3(49) type picker → Art. 73 15/10/2 vs GPAI CoP 2/5/10/15; Commission GPAI template as PDF export |
| 7 | **FRIA v2 premium assessment skill**: APDCAT per-right 4×4 likelihood×severity + ISO 42005 Annex E structure; ships via the assessment installer |
| 8 | Public AI transparency page / system-card publishing per org |

**Out of scope:** runtime MCP/guardrail enforcement, integration-heavy
continuous monitoring, eval harnesses (out of scope for this application).

**Catalog-field pipeline for vendor.watch** (cross-app contract, coordinate there):
Transparency-CoP signatory (Section 1/2) · GPAI CoP signatory · training-data summary
status (template/prose/none) · AI BOM availability (CycloneDX/SPDX) · agentic capabilities.

**Caveats:** (i) Art. 50 transitional sub-dates are [S] — verify against the 2026/1744
text before seeding; (ii) items tagged [U] must not appear in product copy.
