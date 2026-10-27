-- The organisation now chooses the frameworks that shape its program
-- (settings.applicability.frameworks, src/config/applicability.ts). A
-- framework not chosen is out of scope.
--
-- Every existing organisation is given, as its choice, the set that was in
-- scope before the question existed, so its scope, its requirement rows and
-- its counts stay exactly as they are. The set is the one
-- legacyFrameworkChoice() computes (the app falls back to the same function
-- for any record this does not reach):
--
--   EU_AI_ACT     unless places are declared and none is the EU or the EEA,
--                 or the three role answers are all "NO";
--   CA_CCPA_ADMT, CO_SB_26_189, TX_TRAIGA, WA_AI_RULES
--                 when California, Colorado, Texas or Washington is declared;
--   NIST_AI_RMF, AIUC_1
--                 always;
--   ISO_42001     unless the certification answer is "NO".
--
-- Data only, no schema change. Only the key settings.applicability.frameworks
-- is written, and only where it is absent, so the migration can run on any
-- database at any version. Nothing is deleted.

UPDATE "organizations" AS o
SET "settings" = jsonb_set(
  CASE
    WHEN jsonb_typeof(o."settings"->'applicability') = 'object' THEN o."settings"
    ELSE o."settings" || jsonb_build_object('applicability', '{}'::jsonb)
  END,
  '{applicability,frameworks}',
  to_jsonb(array_remove(ARRAY[
    CASE
      WHEN (cardinality(o."operatingJurisdictions") > 0
            AND NOT ('EU'::"Jurisdiction" = ANY(o."operatingJurisdictions")
                     OR 'EEA'::"Jurisdiction" = ANY(o."operatingJurisdictions")))
        OR (COALESCE(o."settings"->'applicability'->'answers'->>'buildsForOthers', '') = 'NO'
            AND COALESCE(o."settings"->'applicability'->'answers'->>'usesAi', '') = 'NO'
            AND COALESCE(o."settings"->'applicability'->'answers'->>'generalPurposeModel', '') = 'NO')
      THEN NULL
      ELSE 'EU_AI_ACT'
    END,
    CASE WHEN 'US_CA'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'CA_CCPA_ADMT' END,
    CASE WHEN 'US_CO'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'CO_SB_26_189' END,
    CASE WHEN 'US_TX'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'TX_TRAIGA' END,
    CASE WHEN 'US_WA'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'WA_AI_RULES' END,
    'NIST_AI_RMF',
    CASE
      WHEN COALESCE(o."settings"->'applicability'->'answers'->>'wantsCertification', '') = 'NO' THEN NULL
      ELSE 'ISO_42001'
    END,
    'AIUC_1'
  ]::text[], NULL))
)
WHERE jsonb_typeof(o."settings") = 'object'
  AND o."settings"->'applicability'->'frameworks' IS NULL;

-- An organisation whose settings are empty or not an object gets the same,
-- in a settings object of its own.
UPDATE "organizations" AS o
SET "settings" = jsonb_build_object(
  'applicability',
  jsonb_build_object(
    'frameworks',
    to_jsonb(array_remove(ARRAY[
      CASE
        WHEN cardinality(o."operatingJurisdictions") > 0
          AND NOT ('EU'::"Jurisdiction" = ANY(o."operatingJurisdictions")
                   OR 'EEA'::"Jurisdiction" = ANY(o."operatingJurisdictions"))
        THEN NULL
        ELSE 'EU_AI_ACT'
      END,
      CASE WHEN 'US_CA'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'CA_CCPA_ADMT' END,
      CASE WHEN 'US_CO'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'CO_SB_26_189' END,
      CASE WHEN 'US_TX'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'TX_TRAIGA' END,
      CASE WHEN 'US_WA'::"Jurisdiction" = ANY(o."operatingJurisdictions") THEN 'WA_AI_RULES' END,
      'NIST_AI_RMF',
      'ISO_42001',
      'AIUC_1'
    ]::text[], NULL))
  )
)
WHERE o."settings" IS NULL OR jsonb_typeof(o."settings") <> 'object';
