// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Spanish display text for AIUC-1 (src/config/aiuc1-requirements.ts): our
 * translation of each requirement's short title and of the capability tags,
 * shown on the Spanish screens. The codes, the stored data and the English
 * titles are unchanged; the standard publishes in English only, so the
 * English title stays the reference and is what the exports cite.
 *
 * Pure module: no Prisma, no React, no Next.
 */

import type { Aiuc1Requirement } from "./aiuc1-requirements";

export const AIUC1_TITLES_ES: Readonly<Record<string, string>> = {
  A001: "Establecer la política de datos de entrada",
  A002: "Establecer la política de datos de salida",
  A003: "Limitar el acceso del agente a los datos",
  A004: "Proteger la propiedad intelectual y los secretos empresariales",
  A005: "Evitar que los datos de un cliente lleguen a otro",
  A006: "Evitar la filtración de datos personales",
  A007: "Evitar infracciones de propiedad intelectual",
  A008: "Evitar la filtración de credenciales y secretos",
  B001: "Pruebas de terceros de resistencia frente a ataques",
  B002: "Detectar entradas maliciosas",
  B003: "Controlar la publicación de detalles técnicos",
  B004: "Evitar la extracción masiva desde los puntos de acceso de la IA",
  B005: "Filtrar las entradas en tiempo real",
  B006: "Evitar acciones no autorizadas del agente",
  B007: "Aplicar los permisos de acceso de los usuarios a los sistemas de IA",
  B008: "Proteger el entorno de despliegue del sistema de IA",
  B009: "Limitar la exposición excesiva en las respuestas",
  B010: "Favorecer patrones seguros en el código generado",
  C001: "Definir una taxonomía de riesgos de la IA",
  C002: "Hacer pruebas antes del despliegue",
  C003: "Evitar respuestas dañinas",
  C004: "Evitar respuestas fuera de la finalidad",
  C005: "Evitar respuestas de alto riesgo propias del agente",
  C006: "Evitar vulnerabilidades en las respuestas",
  C007: "Marcar las respuestas de alto riesgo para revisión humana",
  C008: "Vigilar las categorías de riesgo de la IA",
  C009: "Permitir comentarios e intervención en tiempo real",
  C010: "Pruebas de terceros sobre respuestas dañinas",
  C011: "Pruebas de terceros sobre respuestas fuera de la finalidad",
  C012: "Pruebas de terceros sobre los riesgos que define el cliente",
  D001: "Evitar respuestas inventadas",
  D002: "Pruebas de terceros sobre respuestas inventadas",
  D003: "Restringir las llamadas peligrosas a herramientas",
  D004: "Pruebas de terceros de las llamadas a herramientas",
  E001: "Plan ante fallos de la IA por brechas de seguridad",
  E002: "Plan ante fallos de la IA por respuestas dañinas",
  E003: "Plan ante fallos de la IA por respuestas inventadas",
  E004: "Asignar responsabilidades",
  E005: "Documentar la seguridad del almacenamiento de datos",
  E006: "Revisar a los proveedores",
  E008: "Revisar los procesos internos",
  E009: "Vigilar el acceso de terceros",
  E010: "Establecer la política de uso aceptable de la IA",
  E011: "Registrar dónde se tratan los datos",
  E012: "Documentar el cumplimiento normativo",
  E013: "Implantar un sistema de gestión de la calidad",
  E015: "Registrar la actividad del sistema de IA",
  E016: "Implantar mecanismos para avisar de que es IA",
  E017: "Documentar la política de transparencia del sistema",
  F001: "Evitar el uso indebido de la IA para ciberataques",
  F002: "Evitar usos indebidos catastróficos",
};

export const AIUC1_CAPABILITIES_ES: Readonly<Record<string, string>> = {
  Universal: "Todos los agentes",
  "External-facing": "De cara al público",
  "Code-generation": "Generación de código",
  "Text-generation": "Generación de texto",
  "Voice-generation": "Generación de voz",
  "Image-generation": "Generación de imágenes",
  Automation: "Automatización",
};

/** The requirement's title in the screen's language. */
export function aiuc1Title(requirement: Pick<Aiuc1Requirement, "code" | "title">, locale: string): string {
  return locale === "es" ? (AIUC1_TITLES_ES[requirement.code] ?? requirement.title) : requirement.title;
}

/** The capability tags in the screen's language, as one list. */
export function aiuc1Capabilities(capabilities: readonly string[], locale: string): string {
  return capabilities.map((c) => (locale === "es" ? (AIUC1_CAPABILITIES_ES[c] ?? c) : c)).join(", ");
}
