// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Spreadsheet import for the AI inventory: parse a CSV export and map its rows
 * onto AI system fields.
 *
 * Most organisations arrive with their inventory in a spreadsheet. Excel in
 * Spain and much of Europe exports with ";" as the separator, so the delimiter
 * is detected, not assumed. Column headers are matched in English and Spanish.
 *
 * One rule matters more than convenience: a risk tier is imported only when
 * the sheet states one in words we recognise. An unrecognised or empty tier
 * leaves the system unclassified, so it shows up as a gap to classify, never
 * as a guess.
 *
 * Pure: runs in the browser (preview) and on the server (validation).
 */

export const TECHNIQUES = [
  "MACHINE_LEARNING", "DEEP_LEARNING", "GENERATIVE_AI", "AGENTIC_AI", "NLP", "COMPUTER_VISION",
  "SPEECH_RECOGNITION", "ROBOTICS", "RULE_BASED", "EXPERT_SYSTEM", "STATISTICAL", "OTHER",
] as const;
export const ROLES = ["PROVIDER", "DEPLOYER", "IMPORTER", "DISTRIBUTOR", "USER"] as const;
export const STATUSES = ["DRAFT", "DEVELOPMENT", "TESTING", "DEPLOYED", "RETIRED"] as const;
export const RISK_LEVELS = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"] as const;

export type Technique = (typeof TECHNIQUES)[number];
export type Role = (typeof ROLES)[number];
export type Status = (typeof STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const MAX_IMPORT_ROWS = 500;

// ── CSV ────────────────────────────────────────────────────────────

/** RFC 4180 parsing with a detected delimiter (",", ";" or tab). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", "\t", ","].reduce(
    (best, d) => (countOutsideQuotes(firstLine, d) > countOutsideQuotes(firstLine, best) ? d : best),
    ",",
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === "") inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function countOutsideQuotes(line: string, d: string): number {
  let n = 0;
  let q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (c === d && !q) n++;
  }
  return n;
}

// ── Header mapping ─────────────────────────────────────────────────

export type ImportField =
  | "name" | "description" | "purpose" | "vendor" | "technique" | "role" | "status"
  | "businessOwner" | "technicalOwner" | "personalData" | "riskLevel";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  name: ["name", "system", "system name", "ai system", "tool", "nombre", "sistema", "nombre del sistema", "herramienta"],
  description: ["description", "descripcion", "details", "detalle"],
  purpose: ["purpose", "use case", "intended purpose", "finalidad", "proposito", "caso de uso", "uso"],
  vendor: ["vendor", "supplier", "provider company", "proveedor", "fabricante", "suministrador"],
  technique: ["technique", "type", "ai type", "technology", "tecnica", "tipo", "tecnologia"],
  role: ["role", "our role", "ai act role", "rol", "papel", "rol en el reglamento"],
  status: ["status", "lifecycle", "stage", "estado", "fase"],
  businessOwner: ["business owner", "owner", "responsable", "responsable de negocio", "propietario"],
  technicalOwner: ["technical owner", "it owner", "responsable tecnico"],
  personalData: ["personal data", "processes personal data", "pii", "datos personales", "trata datos personales"],
  riskLevel: ["risk", "risk level", "risk tier", "ai act risk", "riesgo", "nivel de riesgo"],
};

/** Column index for each recognised field; unrecognised columns are ignored. */
export function mapHeaders(headers: string[]): Partial<Record<ImportField, number>> {
  const out: Partial<Record<ImportField, number>> = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS) as [ImportField, string[]][]) {
      if (out[field] === undefined && synonyms.includes(n)) {
        out[field] = i;
        return;
      }
    }
  });
  return out;
}

// ── Value mapping ──────────────────────────────────────────────────

const has = (v: string, words: string[]) => words.some((w) => v === w || v.includes(w));

export function toTechnique(raw: string): Technique {
  const v = norm(raw);
  if (!v) return "OTHER";
  const exact = TECHNIQUES.find((t) => norm(t) === v);
  if (exact) return exact;
  if (has(v, ["agent", "agentic", "agente"])) return "AGENTIC_AI";
  if (has(v, ["generative", "genai", "llm", "chatbot", "copilot", "gpt", "generativa"])) return "GENERATIVE_AI";
  if (has(v, ["vision", "image", "imagen", "ocr"])) return "COMPUTER_VISION";
  if (has(v, ["speech", "voice", "transcri", "voz"])) return "SPEECH_RECOGNITION";
  if (has(v, ["nlp", "language", "text", "lenguaje", "texto"])) return "NLP";
  if (has(v, ["deep", "neural", "profundo", "neuronal"])) return "DEEP_LEARNING";
  if (has(v, ["rule", "regla", "determin"])) return "RULE_BASED";
  if (has(v, ["statistic", "estadist", "regression", "regresion"])) return "STATISTICAL";
  if (has(v, ["machine learning", "ml", "aprendizaje automatico", "predict", "scoring"])) return "MACHINE_LEARNING";
  return "OTHER";
}

export function toRole(raw: string): Role {
  const v = norm(raw);
  if (has(v, ["provider", "developer", "desarrollador", "fabricante"]) || v === "proveedor") return "PROVIDER";
  if (has(v, ["import"])) return "IMPORTER";
  if (has(v, ["distribut"])) return "DISTRIBUTOR";
  // Most organisations use AI they bought: deployer is the safe default.
  return "DEPLOYER";
}

export function toStatus(raw: string): Status {
  const v = norm(raw);
  if (has(v, ["deployed", "production", "live", "in use", "produccion", "en uso", "desplegado", "activo"])) return "DEPLOYED";
  if (has(v, ["test", "pilot", "piloto", "prueba"])) return "TESTING";
  if (has(v, ["develop", "build", "desarrollo"])) return "DEVELOPMENT";
  if (has(v, ["retired", "decommission", "retirado", "baja"])) return "RETIRED";
  return "DRAFT";
}

/** Only a tier the sheet states in words we recognise; otherwise null (unclassified). */
export function toRiskLevel(raw: string): RiskLevel | null {
  const v = norm(raw);
  if (!v) return null;
  if (has(v, ["unacceptable", "prohibited", "inaceptable", "prohibido"])) return "UNACCEPTABLE";
  if (v === "high" || v === "alto" || has(v, ["high risk", "riesgo alto", "alto riesgo"])) return "HIGH";
  if (v === "limited" || v === "limitado" || has(v, ["limited risk", "riesgo limitado", "transparency"])) return "LIMITED";
  if (v === "minimal" || v === "minimo" || v === "low" || v === "bajo" || has(v, ["minimal risk", "riesgo minimo"])) return "MINIMAL";
  return null;
}

/** Tri-state: an empty cell stays unknown. */
export function toYesNo(raw: string): boolean | null {
  const v = norm(raw);
  if (!v) return null;
  if (["yes", "y", "true", "1", "si", "s", "x"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return null;
}

// ── Rows ───────────────────────────────────────────────────────────

export interface ImportRow {
  name: string;
  description?: string;
  purpose?: string;
  vendor?: string;
  technique: Technique;
  role: Role;
  status: Status;
  businessOwner?: string;
  technicalOwner?: string;
  processesPersonalData: boolean | null;
  riskLevel: RiskLevel | null;
}

export interface ParsedInventory {
  rows: ImportRow[];
  /** Recognised columns, by field. */
  columns: Partial<Record<ImportField, number>>;
  /** 1-based data row numbers skipped for having no name. */
  skippedNoName: number[];
  /** Rows beyond MAX_IMPORT_ROWS, not imported. */
  truncated: number;
  error?: "no-rows" | "no-name-column";
}

export function parseInventory(text: string): ParsedInventory {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], columns: {}, skippedNoName: [], truncated: 0, error: "no-rows" };
  const [headers, ...data] = table;
  const columns = mapHeaders(headers);
  if (columns.name === undefined) return { rows: [], columns, skippedNoName: [], truncated: 0, error: "no-name-column" };

  const cell = (r: string[], f: ImportField) => (columns[f] === undefined ? "" : (r[columns[f]!] ?? "").trim());
  const opt = (v: string) => (v === "" ? undefined : v);

  const rows: ImportRow[] = [];
  const skippedNoName: number[] = [];
  data.forEach((r, i) => {
    const name = cell(r, "name");
    if (!name) {
      skippedNoName.push(i + 1);
      return;
    }
    rows.push({
      name: name.slice(0, 200),
      description: opt(cell(r, "description")),
      purpose: opt(cell(r, "purpose")),
      vendor: opt(cell(r, "vendor"))?.slice(0, 200),
      technique: toTechnique(cell(r, "technique")),
      role: toRole(cell(r, "role")),
      status: toStatus(cell(r, "status")),
      businessOwner: opt(cell(r, "businessOwner")),
      technicalOwner: opt(cell(r, "technicalOwner")),
      processesPersonalData: toYesNo(cell(r, "personalData")),
      riskLevel: toRiskLevel(cell(r, "riskLevel")),
    });
  });
  const truncated = Math.max(0, rows.length - MAX_IMPORT_ROWS);
  return { rows: rows.slice(0, MAX_IMPORT_ROWS), columns, skippedNoName, truncated };
}

/** The template offered for download, with one example row per language. */
export function inventoryTemplateCsv(locale: "en" | "es"): string {
  if (locale === "es") {
    return [
      "Nombre;Descripción;Finalidad;Proveedor;Técnica;Rol;Estado;Responsable;Datos personales;Nivel de riesgo",
      "Asistente de atención al cliente;Chat en la web;Responder consultas de clientes;OpenAI;IA generativa;Responsable del despliegue;En uso;Atención al cliente;Sí;Limitado",
    ].join("\r\n");
  }
  return [
    "Name,Description,Purpose,Vendor,Technique,Role,Status,Business owner,Personal data,Risk level",
    "Customer support assistant,Website chat,Answer customer questions,OpenAI,Generative AI,Deployer,In use,Customer service,Yes,Limited",
  ].join("\r\n");
}
