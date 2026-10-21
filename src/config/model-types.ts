// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The choices for a model's type. The column stays free text (older records
 * hold whatever was typed, and "Other" lets a person describe a type not
 * listed), so a stored value is shown as its label when it is one of these
 * keys and as written otherwise.
 */

export const MODEL_TYPE_KEYS = [
  "LANGUAGE_MODEL",
  "VISION",
  "SPEECH",
  "CLASSIC_ML",
  "RULES",
  "OTHER",
] as const;

export type ModelTypeKey = (typeof MODEL_TYPE_KEYS)[number];

export const MODEL_TYPE_LABELS: Record<ModelTypeKey, { en: string; es: string }> = {
  LANGUAGE_MODEL: { en: "Language model", es: "Modelo de lenguaje" },
  VISION: { en: "Vision (images and video)", es: "Visión (imagen y vídeo)" },
  SPEECH: { en: "Speech and audio", es: "Voz y audio" },
  CLASSIC_ML: {
    en: "Classic machine learning (classification, regression, ranking)",
    es: "Aprendizaje automático clásico (clasificación, regresión, ordenación)",
  },
  RULES: { en: "Rules or decision logic", es: "Reglas o lógica de decisión" },
  OTHER: { en: "Other", es: "Otro" },
};

export function isModelTypeKey(value: string | null | undefined): value is ModelTypeKey {
  return !!value && (MODEL_TYPE_KEYS as readonly string[]).includes(value);
}

/** The text to show for a stored model type: its label, or the value as written. */
export function modelTypeLabel(value: string | null | undefined, lang: "en" | "es" = "en"): string {
  if (!value) return "";
  return isModelTypeKey(value) ? MODEL_TYPE_LABELS[value][lang] : value;
}

/**
 * The drop-down's value for a stored model type: the key itself, "OTHER" for a
 * value written by hand, or "" when nothing is stored.
 */
export function modelTypeChoice(value: string | null | undefined): ModelTypeKey | "" {
  if (!value) return "";
  return isModelTypeKey(value) ? value : "OTHER";
}
