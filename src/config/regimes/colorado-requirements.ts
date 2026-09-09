// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Colorado SB 26-189 (signed 14 May 2026, effective 1 January 2027), which
 * repealed and replaced the Colorado AI Act (SB 24-205). The duty of care,
 * deployer risk-management programmes and impact assessments of the original
 * act are gone; what remains is a transparency regime around automated
 * decision-making technology (ADMT) that materially influences a consequential
 * decision. Enforcement is subject to a pending federal challenge in which the
 * court stayed the predecessor statute; confirm the posture with Colorado
 * counsel before relying on any date.
 *
 * Section numbering of the enrolled act is not reproduced here; rows are
 * labelled by duty. Scope tags: co:core (covered ADMT with a Colorado nexus),
 * co:developer, co:deployer. Legal sign-off PENDING.
 */

import { signoffMarker } from "@/config/legal-signoff";
import type { RegimeFramework, RegimePack, RegimeRequirementSeed } from "./types";

const REVIEWED = "2026-09-08";

export const COLORADO_FRAMEWORK: RegimeFramework = {
  code: "CO_SB_26_189",
  idPrefix: "co",
  name: "Colorado SB 26-189 (ADMT transparency)",
  version: "SB 26-189, effective 1 Jan 2027",
  abbreviation: "CO",
  description:
    "Colorado's replacement automated decision-making law: notice, post-decision disclosure and consumer recourse for ADMT that materially influences consequential decisions in education, employment, housing, financial or lending services, insurance, health care, legal services and government services. Developers owe deployers technical documentation. Enforcement by the Attorney General; a federal challenge to the predecessor statute is pending.",
  contentVersion: "2026.09.1",
  lawReviewedAsOf: REVIEWED,
  reviewMarker: signoffMarker("CO_SB_26_189"),
};

const CORE = ["jurisdiction:US_CO", "co:core"] as const;
const DEV = ["jurisdiction:US_CO", "co:developer"] as const;
const DEP = ["jurisdiction:US_CO", "co:deployer"] as const;

export const COLORADO_REQUIREMENTS: RegimeRequirementSeed[] = [
  {
    slug: "scope",
    code: "CO-SCOPE",
    title: { en: "Covered ADMT and consequential decisions", es: "ADMT cubierta y decisiones con consecuencias" },
    description: {
      en: "The act reaches automated decision-making technology used to materially influence a consequential decision about a Colorado consumer: access to or the cost or terms of education, employment or employment opportunity, housing, a financial or lending service, insurance, health care, legal services or an essential government service. Record, per system, the decision domain and how the technology influences the outcome.",
      es: "La ley alcanza a la tecnología de decisión automatizada utilizada para influir de forma material en una decisión con consecuencias para un consumidor de Colorado: el acceso, el coste o las condiciones de la educación, el empleo o una oportunidad laboral, la vivienda, un servicio financiero o de crédito, un seguro, la asistencia sanitaria, los servicios jurídicos o un servicio público esencial. Deja constancia, por sistema, del ámbito de la decisión y de cómo influye la tecnología en el resultado.",
    },
    applicabilityTags: CORE,
    sortOrder: 10,
  },
  {
    slug: "dev-documentation",
    code: "CO-DEV-1",
    title: { en: "Developer: technical documentation to deployers", es: "Desarrollador: documentación técnica para los responsables del despliegue" },
    description: {
      en: "From 1 January 2027 a developer of covered ADMT must give each deployer documentation describing the intended uses, the categories of training data, known limitations, and instructions for appropriate use and for human review of the technology's outputs.",
      es: "Desde el 1 de enero de 2027, el desarrollador de una ADMT cubierta debe entregar a cada responsable del despliegue documentación que describa los usos previstos, las categorías de datos de entrenamiento, las limitaciones conocidas y las instrucciones para un uso adecuado y para la revisión humana de los resultados de la tecnología.",
    },
    applicabilityTags: DEV,
    sortOrder: 100,
  },
  {
    slug: "dev-updates",
    code: "CO-DEV-2",
    title: { en: "Developer: keep documentation current", es: "Desarrollador: mantener la documentación actualizada" },
    description: {
      en: "Update the documentation when the technology is materially modified, so that deployers' notices and human-review instructions do not describe a system that no longer exists.",
      es: "Actualiza la documentación cuando la tecnología se modifique de forma sustancial, para que los avisos y las instrucciones de revisión humana del responsable del despliegue no describan un sistema que ya no existe.",
    },
    applicabilityTags: DEV,
    sortOrder: 110,
  },
  {
    slug: "dep-notice-point-of-interaction",
    code: "CO-DEP-1",
    title: { en: "Deployer: notice at the point of interaction", es: "Responsable del despliegue: aviso en el punto de interacción" },
    description: {
      en: "Provide clear and conspicuous notice to the consumer, at the point of interaction with the covered ADMT and before the decision, that automated decision-making technology is used in a consequential decision about them, in plain language and in an accessible format.",
      es: "Facilita al consumidor un aviso claro y visible, en el punto de interacción con la ADMT cubierta y antes de la decisión, de que se utiliza tecnología de decisión automatizada en una decisión con consecuencias sobre él, en lenguaje sencillo y en un formato accesible.",
    },
    applicabilityTags: DEP,
    sortOrder: 200,
  },
  {
    slug: "dep-notice-content",
    code: "CO-DEP-2",
    title: { en: "Deployer: content of the advance notice", es: "Responsable del despliegue: contenido del aviso previo" },
    description: {
      en: "The advance notice must describe the purpose of the ADMT, the nature of the consequential decision it influences, the categories of personal data it uses, and the consumer's rights under the act, including how to exercise them. Align its wording with the California pre-use notice so one layered notice serves both states.",
      es: "El aviso previo debe describir la finalidad de la ADMT, la naturaleza de la decisión con consecuencias en la que influye, las categorías de datos personales que utiliza y los derechos del consumidor conforme a la ley, incluida la forma de ejercerlos. Alinea su redacción con el aviso previo al uso de California para que un único aviso por capas sirva en ambos estados.",
    },
    applicabilityTags: DEP,
    sortOrder: 210,
  },
  {
    slug: "dep-adverse-disclosure",
    code: "CO-DEP-3",
    title: { en: "Deployer: post-decision disclosure after an adverse outcome", es: "Responsable del despliegue: información posterior a una decisión desfavorable" },
    description: {
      en: "After a consequential decision adverse to the consumer in which covered ADMT was used, disclose that it was used, the principal reasons for the decision in plain language, the categories of personal data that drove it, and the consumer's rights to correct data and to seek review.",
      es: "Tras una decisión con consecuencias desfavorable para el consumidor en la que se haya utilizado una ADMT cubierta, informa de que se utilizó, de las razones principales de la decisión en lenguaje sencillo, de las categorías de datos personales que la determinaron y de los derechos del consumidor a corregir sus datos y a solicitar una revisión.",
    },
    applicabilityTags: DEP,
    sortOrder: 220,
  },
  {
    slug: "dep-correction-and-review",
    code: "CO-DEP-4",
    title: { en: "Deployer: correction of data and human review", es: "Responsable del despliegue: corrección de datos y revisión humana" },
    description: {
      en: "Give the consumer a route to correct inaccurate personal data used by the ADMT and to have the adverse decision reviewed by a person with authority to change it. This is the Colorado anchor of the human-review and appeal protocol.",
      es: "Ofrece al consumidor una vía para corregir los datos personales inexactos utilizados por la ADMT y para que una persona con autoridad para cambiarla revise la decisión desfavorable. Es el anclaje en Colorado del protocolo de revisión humana y recurso.",
    },
    applicabilityTags: DEP,
    sortOrder: 230,
  },
  {
    slug: "dep-website-statement",
    code: "CO-DEP-5",
    title: { en: "Deployer: public statement on ADMT use", es: "Responsable del despliegue: declaración pública sobre el uso de ADMT" },
    description: {
      en: "Maintain a clear, readily available public statement summarising the types of covered ADMT the deployer uses, how it manages the risks of those uses, and the nature and sources of information collected and used.",
      es: "Mantén una declaración pública clara y fácilmente accesible que resuma los tipos de ADMT cubierta que utiliza, cómo gestiona los riesgos de esos usos y la naturaleza y las fuentes de la información recogida y utilizada.",
    },
    applicabilityTags: DEP,
    sortOrder: 240,
  },
  {
    slug: "records",
    code: "CO-REC-1",
    title: { en: "Records demonstrating compliance (three years)", es: "Registros que acrediten el cumplimiento (tres años)" },
    description: {
      en: "Developers and deployers must retain the records needed to demonstrate compliance with the act for at least three years, including notices given, documentation exchanged and review requests handled.",
      es: "Los desarrolladores y los responsables del despliegue deben conservar durante al menos tres años los registros necesarios para acreditar el cumplimiento de la ley, incluidos los avisos facilitados, la documentación intercambiada y las solicitudes de revisión tramitadas.",
    },
    applicabilityTags: CORE,
    sortOrder: 300,
  },
  {
    slug: "enforcement",
    code: "CO-ENF-1",
    title: { en: "Enforcement and litigation posture", es: "Aplicación y situación procesal" },
    description: {
      en: "The Attorney General has exclusive enforcement authority; there is no private right of action. A federal challenge to the predecessor statute is pending and the court stayed its enforcement; reporting indicates the stay reaches SB 26-189. Treat 1 January 2027 as the statutory date and confirm the current posture with Colorado counsel.",
      es: "La Fiscalía General tiene la competencia exclusiva de aplicación; no existe acción privada. Está pendiente un litigio federal contra la norma anterior y el tribunal suspendió su aplicación; según la información disponible, la suspensión alcanza a la SB 26-189. Considera el 1 de enero de 2027 como la fecha legal y confirma la situación actual con asesoría jurídica de Colorado.",
    },
    applicabilityTags: CORE,
    sortOrder: 400,
  },
];

export const COLORADO_PACK: RegimePack = { framework: COLORADO_FRAMEWORK, requirements: COLORADO_REQUIREMENTS };
