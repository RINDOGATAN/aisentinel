// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Spanish display text for AIUC-1 (src/config/aiuc1-requirements.ts): our
 * translation of each requirement's short title, of our one-line paraphrases
 * (requirements and domains) and of the capability tags,
 * shown on the Spanish screens. The codes, the stored data and the English
 * titles are unchanged; the standard publishes in English only, so the
 * English title stays the reference and is what the exports cite.
 *
 * Pure module: no Prisma, no React, no Next.
 */

import { AIUC1_FRAMEWORK, type Aiuc1Requirement } from "./aiuc1-requirements";

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

/**
 * Our Spanish paraphrase of each requirement, mirroring the English one in
 * aiuc1-requirements.ts (still a paraphrase, never the standard's text).
 */
export const AIUC1_PARAPHRASES_ES: Readonly<Record<string, string>> = {
  A001: "Informar a los clientes de cómo se usan sus datos de entrada para el entrenamiento y la inferencia, durante cuánto tiempo se conservan y qué derechos tienen sobre ellos.",
  A002: "Fijar y comunicar a los clientes a quién pertenecen los resultados de la IA, cómo pueden usarse, qué opciones de aceptación o exclusión hay y cómo se suprimen.",
  A003: "Restringir los datos a los que puede llegar un agente según la tarea, el rol del usuario, el rol del agente y el contexto.",
  A004: "Impedir que el sistema de IA revele la propiedad intelectual o la información confidencial de la empresa.",
  A005: "Evitar que los datos de un cliente lleguen a otro cliente.",
  A006: "Evitar que se filtren datos personales a través de los resultados de la IA y de los registros.",
  A007: "En los agentes de cara al público, impedir resultados que infrinjan derechos de autor, marcas u otros derechos de propiedad intelectual de terceros.",
  A008: "En los agentes que generan código, detectar e impedir la filtración de secretos a través de las entradas, los resultados, los registros o el almacén de credenciales.",
  B001: "Mantener un programa de pruebas adversarias, con pruebas de terceros, frente a la inyección de instrucciones, la evasión de restricciones (jailbreak) y otras entradas maliciosas.",
  B002: "Vigilar las entradas maliciosas y los intentos de inyección de instrucciones para poder detectarlos y responder a ellos.",
  B003: "No publicar detalles técnicos u organizativos de los sistemas de IA que ayuden a un atacante a dirigirse contra ellos.",
  B004: "Proteger los puntos de acceso externos de la IA frente al sondeo y la extracción masiva, por ejemplo con límites de frecuencia y cuotas de consultas.",
  B005: "Filtrar las entradas en tiempo real con herramientas de moderación automatizadas.",
  B006: "En los agentes que actúan, impedir acciones que vayan más allá del ámbito previsto y de los permisos concedidos.",
  B007: "Mantener los derechos de acceso de los usuarios y los privilegios de administración de los sistemas de IA conforme a la política.",
  B008: "Proteger el entorno en el que funciona el sistema de IA, con cifrado, control de acceso y autorización.",
  B009: "Limitar y ocultar parte de los resultados para que no revelen información útil para un atacante.",
  B010: "En los agentes que generan código, favorecer patrones seguros y evitar vulnerabilidades conocidas en el código que producen.",
  C001: "Elaborar una taxonomía de riesgos del agente, con niveles de gravedad, a partir de sus capacidades y de su contexto de despliegue.",
  C002: "Hacer pruebas internas en todas las categorías de riesgo antes de desplegar un cambio que requiera revisión o aprobación formal.",
  C003: "Impedir resultados dañinos, como respuestas de tono angustiado o airado, consejos de alto riesgo y contenido ofensivo, sesgado o engañoso.",
  C004: "Impedir resultados ajenos a la finalidad prevista del agente, por ejemplo debates políticos o consejos médicos.",
  C005: "Impedir los resultados de alto riesgo propios del agente, tal como los define su taxonomía de riesgos.",
  C006: "Impedir que lleguen a los usuarios fallos de seguridad en los resultados, como la inyección de código o la exfiltración de datos.",
  C007: "Avisar a una persona para que revise los resultados marcados como de alto riesgo.",
  C008: "Vigilar el sistema de IA en uso en todas sus categorías de riesgo.",
  C009: "Permitir que los usuarios hagan comentarios e intervengan en tiempo real, y actuar en función de lo que comuniquen.",
  C010: "Encargar a terceros expertos que prueben el sistema frente a resultados dañinos al menos cada tres meses.",
  C011: "Encargar a terceros expertos que prueben el sistema frente a resultados ajenos a su finalidad al menos cada tres meses.",
  C012: "Encargar a terceros expertos que prueben el sistema frente a los demás resultados de alto riesgo que recoge su taxonomía al menos cada tres meses.",
  D001: "Aplicar salvaguardas frente a los resultados inventados (alucinaciones).",
  D002: "Encargar a terceros expertos pruebas de alucinaciones al menos cada tres meses.",
  D003: "En los agentes que actúan, impedir llamadas a herramientas que realicen acciones no autorizadas, accedan a información restringida o decidan más allá de su ámbito.",
  D004: "Encargar a terceros expertos que prueben las llamadas a herramientas frente a esos fallos al menos cada tres meses.",
  E001: "Mantener un plan documentado ante las brechas de privacidad y seguridad de la IA, con responsables designados, notificación y corrección.",
  E002: "En los agentes de cara al público, mantener un plan documentado ante resultados dañinos que causen un perjuicio importante a los clientes.",
  E003: "En los agentes de cara al público, mantener un plan documentado ante resultados inventados que causen a los clientes pérdidas económicas considerables.",
  E004: "Decidir qué cambios del sistema requieren aprobación formal, designar un responsable para cada uno y dejar constancia de la aprobación con pruebas.",
  E005: "Documentar cómo se protegen los datos almacenados, según su sensibilidad, los requisitos legales, los controles de seguridad y las necesidades operativas.",
  E006: "Aplicar la diligencia debida a los proveedores de modelos fundacionales y de los demás modelos de los que depende el sistema, en cuanto a tratamiento de datos, controles sobre datos personales, seguridad y obligaciones legales.",
  E008: "Revisar periódicamente los procesos internos clave y conservar constancia de las revisiones y aprobaciones.",
  E009: "Vigilar y registrar las conexiones de API, las sesiones y los accesos a datos de terceros.",
  E010: "Adoptar y aplicar una política de uso aceptable de la IA.",
  E011: "Registrar dónde se tratan los datos de la IA.",
  E012: "Registrar qué leyes y normas sobre IA se aplican, qué protección de datos exigen y el plan para cumplirlas.",
  E013: "Mantener un sistema de gestión de la calidad para los sistemas de IA, proporcionado al tamaño de la organización.",
  E015: "Conservar registros de los procesos, acciones y resultados del sistema de IA, cuando esté permitido, para la investigación, la auditoría y la explicación.",
  E016: "Indicar con claridad a los usuarios cuándo están tratando con un sistema de IA y no con una persona.",
  E017: "Adoptar una política de transparencia y mantener fichas de modelo, fichas de datos e informes de interpretabilidad de los sistemas principales.",
  F001: "Implantar, o documentar, salvaguardas frente a los ciberataques y la explotación de vulnerabilidades facilitados por la IA.",
  F002: "Implantar, o documentar, salvaguardas frente a usos indebidos catastróficos (químicos, biológicos, radiológicos o nucleares).",
};

/** Our Spanish paraphrase of each domain (codes A to F). */
export const AIUC1_DOMAIN_PARAPHRASES_ES: Readonly<Record<string, string>> = {
  A: "Evita que los datos de clientes y de la empresa se filtren, queden expuestos entre clientes o se usen para entrenar sin una política clara, mediante políticas de datos, límites de acceso y salvaguardas técnicas.",
  B: "Protege a los agentes frente a la manipulación (entradas maliciosas, inyección de instrucciones, extracción masiva desde los puntos de acceso, acciones no autorizadas) con filtrado de entradas, control de acceso y un entorno de despliegue protegido.",
  C: "Evita resultados dañinos, ajenos a la finalidad o de alto riesgo mediante pruebas antes del despliegue, pruebas de ataque simulado (red teaming), vigilancia y revisión humana donde haga falta.",
  D: "Evita las alucinaciones y las llamadas inseguras a herramientas mediante pruebas, comprobación de fuentes y control de las herramientas que puede usar un agente.",
  E: "Fija quién responde cuando algo falla, cómo se aprueban los cambios, qué se registra y cómo se evalúa a los proveedores externos.",
  F: "Evita que los agentes se usen indebidamente para ciberataques, manipulación o daños catastróficos.",
};

const APPLICATION_ES = {
  mandatory: "Obligatorio para la certificación",
  supplemental: "Complementario (opcional; la organización decide aplicarlo)",
} as const;

/** The requirement's paraphrase in the screen's language. */
export function aiuc1Paraphrase(requirement: Pick<Aiuc1Requirement, "code" | "paraphrase">, locale: string): string {
  return locale === "es" ? (AIUC1_PARAPHRASES_ES[requirement.code] ?? requirement.paraphrase) : requirement.paraphrase;
}

/**
 * The Spanish counterpart of aiuc1RequirementDescription(): the paraphrase,
 * then how the standard applies it, the capability tags and the source page.
 */
export function aiuc1RequirementDescriptionEs(requirement: Aiuc1Requirement): string {
  const paraphrase = AIUC1_PARAPHRASES_ES[requirement.code] ?? requirement.paraphrase;
  return `${paraphrase} ${APPLICATION_ES[requirement.application]}; etiquetas de capacidad: ${aiuc1Capabilities(requirement.capabilities, "es")}. Fuente: ${AIUC1_FRAMEWORK.sourceUrl}${requirement.path}`;
}

/** The requirement's title in the screen's language. */
export function aiuc1Title(requirement: Pick<Aiuc1Requirement, "code" | "title">, locale: string): string {
  return locale === "es" ? (AIUC1_TITLES_ES[requirement.code] ?? requirement.title) : requirement.title;
}

/** The capability tags in the screen's language, as one list. */
export function aiuc1Capabilities(capabilities: readonly string[], locale: string): string {
  return capabilities.map((c) => (locale === "es" ? (AIUC1_CAPABILITIES_ES[c] ?? c) : c)).join(", ");
}
