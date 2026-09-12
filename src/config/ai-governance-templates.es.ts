// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Castilian Spanish (es-ES) translations for the Quick Start industry
 * templates in `./ai-governance-templates`.
 *
 * The dictionary is keyed by the EXACT English source string, so an edit to
 * the English that is not mirrored here falls back to English and fails the
 * coverage test in `ai-governance-templates.es.test.ts`.
 *
 * Covered fields: template name/description; each system's name, description,
 * purpose and riskRationale; each policy's title, description and content.
 * Every other field (ids, icons, enums, annexIIICategory) is left untouched.
 *
 * Terminology follows the official Spanish texts: "Reglamento de IA",
 * "RGPD", "anexo III", "art. 50", "supervisión humana", "evaluación de la
 * conformidad", "evaluación de impacto sobre los derechos fundamentales".
 * Legal sign-off pending, as for the English source.
 *
 * Relative imports only: this file is loaded by scripts in a slim image with
 * no "@/" alias.
 */

import type { AIGovernanceTemplate } from "./ai-governance-templates";

export type TemplateLocale = "en" | "es";

type Pair = readonly [en: string, es: string];

// ============================================================
// TRANSLATIONS
// ============================================================

const PAIRS: readonly Pair[] = [
  // ──────────────────────────────────────────────────
  // E-COMMERCE
  // ──────────────────────────────────────────────────
  ["E-commerce", "Comercio electrónico"],
  [
    "AI systems common in online retail: product recommendations, chatbots, fraud detection, dynamic pricing, and AI-powered search.",
    "Sistemas de IA habituales en el comercio minorista en línea: recomendaciones de productos, chatbots, detección de fraude, precios dinámicos y búsqueda con IA.",
  ],

  // Product Recommendation Engine
  ["Product Recommendation Engine", "Motor de recomendación de productos"],
  [
    "AI-driven product recommendation system that analyzes browsing behavior, purchase history, and user preferences to suggest relevant products.",
    "Sistema de recomendación de productos basado en IA que analiza el comportamiento de navegación, el historial de compras y las preferencias del usuario para sugerir productos pertinentes.",
  ],
  [
    "Personalize product recommendations to improve customer experience and increase conversion rates",
    "Personalizar las recomendaciones de productos para mejorar la experiencia del cliente y aumentar las tasas de conversión",
  ],
  [
    "Product recommendation engines are not listed in EU AI Act Annex III and carry no Art. 50 transparency duty of their own, so they are minimal-risk under the Act. Obligations arise instead from the GDPR (profiling, Art. 22 where decisions are solely automated with significant effects) and, for online platforms, DSA Art. 27 recommender-system transparency.",
    "Los motores de recomendación de productos no figuran en el anexo III del Reglamento de IA y no conllevan por sí mismos ninguna obligación de transparencia del art. 50, por lo que son de riesgo mínimo con arreglo al Reglamento. Las obligaciones derivan, en cambio, del RGPD (elaboración de perfiles; art. 22 cuando las decisiones se basan únicamente en un tratamiento automatizado y producen efectos significativos) y, en el caso de las plataformas en línea, de la transparencia de los sistemas de recomendación prevista en el art. 27 del Reglamento de Servicios Digitales (DSA).",
  ],

  // Customer Support Chatbot (name shared with the SaaS template)
  ["Customer Support Chatbot", "Chatbot de atención al cliente"],
  [
    "AI-powered chatbot handling customer inquiries, order tracking, returns, and FAQ responses.",
    "Chatbot con IA que gestiona las consultas de los clientes, el seguimiento de pedidos, las devoluciones y las respuestas a preguntas frecuentes.",
  ],
  [
    "Provide automated customer support for common inquiries, reducing response time and improving customer satisfaction",
    "Prestar una atención al cliente automatizada para las consultas habituales, reduciendo el tiempo de respuesta y mejorando la satisfacción del cliente",
  ],
  [
    "Conversational AI system with transparency obligations under EU AI Act Art. 50. Users must be clearly informed they are interacting with an AI system. Risk of hallucination in responses.",
    "Sistema de IA conversacional sujeto a obligaciones de transparencia con arreglo al art. 50 del Reglamento de IA. Debe informarse claramente a los usuarios de que están interactuando con un sistema de IA. Riesgo de alucinaciones en las respuestas.",
  ],

  // Transaction Fraud Detection
  ["Transaction Fraud Detection", "Detección de fraude en transacciones"],
  [
    "Real-time AI system analyzing transaction patterns to detect and prevent fraudulent purchases.",
    "Sistema de IA en tiempo real que analiza los patrones de las transacciones para detectar e impedir compras fraudulentas.",
  ],
  [
    "Detect and prevent fraudulent transactions in real-time to protect customers and the business from financial losses",
    "Detectar e impedir transacciones fraudulentas en tiempo real para proteger a los clientes y a la empresa frente a pérdidas económicas",
  ],
  [
    "NOT high-risk under the EU AI Act: Annex III 5(b) (creditworthiness/credit scoring) expressly excludes 'AI systems used for the purpose of detecting financial fraud'. Fraud detection is therefore outside Annex III. Automated blocking of transactions can still engage GDPR Art. 22 (right to human intervention), so human-review mechanisms remain required.",
    "NO es de alto riesgo con arreglo al Reglamento de IA: el punto 5, letra b), del anexo III (solvencia y calificación crediticia) excluye expresamente «los sistemas de IA utilizados al objeto de detectar fraudes financieros». Por tanto, la detección de fraude queda fuera del anexo III. No obstante, el bloqueo automatizado de transacciones puede activar el art. 22 del RGPD (derecho a obtener intervención humana), por lo que siguen siendo necesarios mecanismos de revisión humana.",
  ],

  // Dynamic Pricing Engine
  ["Dynamic Pricing Engine", "Motor de precios dinámicos"],
  [
    "AI system that adjusts product prices based on demand, competition, inventory levels, and customer segments.",
    "Sistema de IA que ajusta los precios de los productos en función de la demanda, la competencia, los niveles de existencias y los segmentos de clientes.",
  ],
  [
    "Optimize product pricing in real-time based on market conditions and demand signals",
    "Optimizar los precios de los productos en tiempo real en función de las condiciones del mercado y las señales de demanda",
  ],
  [
    "Pricing system that may use personal data for segmentation. Transparency obligations apply regarding AI-driven pricing. Risk of discriminatory pricing if demographic data is used directly or indirectly.",
    "Sistema de fijación de precios que puede utilizar datos personales para la segmentación. Se aplican obligaciones de transparencia respecto de la fijación de precios mediante IA. Riesgo de precios discriminatorios si se utilizan datos demográficos de forma directa o indirecta.",
  ],

  // AI-Powered Product Search
  ["AI-Powered Product Search", "Búsqueda de productos con IA"],
  [
    "Semantic search engine using NLP to understand natural language product queries and return relevant results.",
    "Motor de búsqueda semántica que utiliza procesamiento del lenguaje natural (PLN) para comprender las consultas sobre productos formuladas en lenguaje natural y devolver resultados pertinentes.",
  ],
  [
    "Improve product discovery through natural language understanding and semantic search capabilities",
    "Mejorar el descubrimiento de productos mediante la comprensión del lenguaje natural y funciones de búsqueda semántica",
  ],
  [
    "Search functionality that does not make decisions affecting individuals. Processes search queries but does not profile users or make consequential decisions.",
    "Funcionalidad de búsqueda que no adopta decisiones que afecten a las personas. Trata las consultas de búsqueda, pero no elabora perfiles de los usuarios ni adopta decisiones con consecuencias relevantes.",
  ],

  // Policies
  ["AI Usage Policy - E-commerce", "Política de uso de la IA - Comercio electrónico"],
  [
    "Governs the acceptable use of AI systems across e-commerce operations",
    "Regula el uso aceptable de los sistemas de IA en todas las operaciones de comercio electrónico",
  ],
  [
    "This policy establishes guidelines for the responsible use of AI systems in our e-commerce operations. All AI systems that interact with customers, process personal data, or influence purchasing decisions must be registered in the AI Registry before deployment.\n\nProduct recommendation engines and dynamic pricing systems must clearly disclose AI involvement to customers. Customer support chatbots must identify themselves as AI systems at the start of each interaction. Fraud detection systems must provide human review mechanisms for flagged transactions.\n\nAll teams deploying AI systems must complete AI awareness training and adhere to the organization's data protection policies when processing customer data through AI systems.",
    "Esta política establece directrices para el uso responsable de los sistemas de IA en nuestras operaciones de comercio electrónico. Todos los sistemas de IA que interactúen con los clientes, traten datos personales o influyan en las decisiones de compra deben inscribirse en el Registro de IA antes de su despliegue.\n\nLos motores de recomendación de productos y los sistemas de precios dinámicos deben informar claramente a los clientes de la intervención de la IA. Los chatbots de atención al cliente deben identificarse como sistemas de IA al inicio de cada interacción. Los sistemas de detección de fraude deben ofrecer mecanismos de revisión humana para las transacciones señaladas.\n\nTodos los equipos que desplieguen sistemas de IA deben completar la formación de concienciación sobre IA y cumplir las políticas de protección de datos de la organización cuando traten datos de clientes mediante sistemas de IA.",
  ],
  ["AI Transparency Policy - E-commerce", "Política de transparencia de la IA - Comercio electrónico"],
  [
    "Ensures transparency in AI-driven customer interactions and decisions",
    "Garantiza la transparencia en las interacciones con los clientes y en las decisiones basadas en IA",
  ],
  [
    "This policy ensures customers are appropriately informed about AI systems that affect their shopping experience. In compliance with EU AI Act Article 50, all customer-facing AI systems must clearly disclose AI involvement.\n\nChatbots and virtual assistants must identify themselves as AI at the start of each conversation. AI-generated product recommendations must be labeled as such. Dynamic pricing must not discriminate based on protected characteristics, and customers must be able to request human review of AI-driven decisions that significantly affect them.\n\nRegular transparency reports must be published documenting which AI systems are in use, their purposes, and their impact on customer experiences.",
    "Esta política garantiza que los clientes estén debidamente informados sobre los sistemas de IA que afectan a su experiencia de compra. En cumplimiento del artículo 50 del Reglamento de IA, todos los sistemas de IA que interactúan con los clientes deben informar claramente de la intervención de la IA.\n\nLos chatbots y asistentes virtuales deben identificarse como IA al inicio de cada conversación. Las recomendaciones de productos generadas por IA deben etiquetarse como tales. Los precios dinámicos no deben discriminar por razón de características protegidas, y los clientes deben poder solicitar la revisión humana de las decisiones basadas en IA que les afecten de manera significativa.\n\nDeben publicarse periódicamente informes de transparencia que documenten qué sistemas de IA se utilizan, sus finalidades y su repercusión en las experiencias de los clientes.",
  ],

  // ──────────────────────────────────────────────────
  // HEALTHCARE
  // ──────────────────────────────────────────────────
  ["Healthcare", "Sanidad"],
  [
    "AI systems in healthcare settings: clinical decision support, medical imaging analysis, patient triage, and drug interaction checking.",
    "Sistemas de IA en entornos sanitarios: apoyo a la decisión clínica, análisis de imagen médica, triaje de pacientes y verificación de interacciones farmacológicas.",
  ],

  // Clinical Decision Support System
  ["Clinical Decision Support System", "Sistema de apoyo a la decisión clínica"],
  [
    "AI system providing clinicians with evidence-based treatment recommendations, diagnostic suggestions, and risk assessments.",
    "Sistema de IA que ofrece a los profesionales clínicos recomendaciones de tratamiento basadas en la evidencia, propuestas diagnósticas y evaluaciones de riesgos.",
  ],
  [
    "Support clinical decision-making by providing AI-driven diagnostic suggestions and treatment recommendations based on patient data and medical literature",
    "Apoyar la toma de decisiones clínicas mediante propuestas diagnósticas y recomendaciones de tratamiento generadas por IA a partir de los datos del paciente y de la literatura médica",
  ],
  [
    "AI system intended for use in healthcare that directly influences clinical decisions affecting patient health and safety. High-risk via EU AI Act Art. 6(1): clinical decision support is typically software as a medical device under the MDR (Reg. (EU) 2017/745, Rule 11 — usually Class IIa or higher), i.e. a product covered by Annex I Union harmonisation legislation subject to third-party conformity assessment. Not an Annex III listing.",
    "Sistema de IA destinado a utilizarse en la asistencia sanitaria que influye directamente en decisiones clínicas que afectan a la salud y la seguridad de los pacientes. Es de alto riesgo por la vía del art. 6, apartado 1, del Reglamento de IA: el apoyo a la decisión clínica suele ser un programa informático que constituye un producto sanitario con arreglo al MDR (Reglamento (UE) 2017/745, regla 11, normalmente clase IIa o superior), es decir, un producto regulado por los actos legislativos de armonización de la Unión enumerados en el anexo I y sujeto a una evaluación de la conformidad de terceros. No figura en el anexo III.",
  ],

  // Medical Imaging Analysis
  ["Medical Imaging Analysis", "Análisis de imagen médica"],
  [
    "Deep learning system for analyzing medical images (X-rays, MRIs, CT scans) to assist radiologists in detecting anomalies.",
    "Sistema de aprendizaje profundo que analiza imágenes médicas (radiografías, resonancias magnéticas, tomografías computarizadas) para ayudar a los radiólogos a detectar anomalías.",
  ],
  [
    "Assist radiologists by analyzing medical images for potential anomalies, improving diagnostic accuracy and reducing analysis time",
    "Ayudar a los radiólogos analizando imágenes médicas en busca de posibles anomalías, mejorando la precisión diagnóstica y reduciendo el tiempo de análisis",
  ],
  [
    "AI system processing sensitive health data and directly influencing diagnostic decisions. As medical-device software under the MDR (Reg. (EU) 2017/745), it is high-risk via EU AI Act Art. 6(1)/Annex I — the medical-device route, not Annex III. Requires rigorous validation and human oversight.",
    "Sistema de IA que trata datos sensibles de salud e influye directamente en decisiones diagnósticas. Como programa informático que constituye un producto sanitario con arreglo al MDR (Reglamento (UE) 2017/745), es de alto riesgo en virtud del art. 6, apartado 1, y del anexo I del Reglamento de IA (la vía de los productos sanitarios, no el anexo III). Requiere una validación rigurosa y supervisión humana.",
  ],

  // Patient Triage Chatbot
  ["Patient Triage Chatbot", "Chatbot de triaje de pacientes"],
  [
    "AI-powered triage system that assesses patient symptoms, urgency levels, and directs patients to appropriate care pathways.",
    "Sistema de triaje con IA que evalúa los síntomas y el nivel de urgencia de los pacientes y los deriva a los itinerarios asistenciales adecuados.",
  ],
  [
    "Provide initial patient assessment and triage, directing patients to appropriate care levels based on reported symptoms",
    "Realizar la valoración inicial y el triaje de los pacientes, derivándolos al nivel asistencial adecuado en función de los síntomas comunicados",
  ],
  [
    "AI system making triage decisions that affect patient access to urgent care. Incorrect triage could delay critical care. Where used for emergency healthcare patient triage, it falls under EU AI Act Annex III 5(d) (evaluation/classification of emergency calls and emergency healthcare patient triage systems). Requires robust human oversight and fallback mechanisms.",
    "Sistema de IA que adopta decisiones de triaje que afectan al acceso de los pacientes a la atención urgente. Un triaje incorrecto podría retrasar una atención crítica. Cuando se utiliza para el triaje de pacientes en la asistencia sanitaria de urgencia, está comprendido en el punto 5, letra d), del anexo III del Reglamento de IA (evaluación y clasificación de llamadas de emergencia y sistemas de triaje de pacientes en la asistencia sanitaria de urgencia). Requiere una supervisión humana sólida y mecanismos alternativos de respaldo.",
  ],

  // Drug Interaction Checker
  ["Drug Interaction Checker", "Verificador de interacciones farmacológicas"],
  [
    "AI system analyzing medication combinations to identify potential adverse drug interactions and contraindications.",
    "Sistema de IA que analiza combinaciones de medicamentos para detectar posibles interacciones farmacológicas adversas y contraindicaciones.",
  ],
  [
    "Detect potential drug interactions and contraindications to improve patient safety in medication management",
    "Detectar posibles interacciones farmacológicas y contraindicaciones para mejorar la seguridad del paciente en la gestión de la medicación",
  ],
  [
    "Safety-critical AI system where errors could lead to adverse drug events. Directly impacts patient safety through medication-related decisions. As clinical software under the MDR, it is high-risk via EU AI Act Art. 6(1)/Annex I (medical-device route), not Annex III.",
    "Sistema de IA crítico para la seguridad, en el que los errores podrían provocar acontecimientos adversos por medicamentos. Repercute directamente en la seguridad del paciente a través de decisiones relacionadas con la medicación. Como programa informático clínico sujeto al MDR, es de alto riesgo en virtud del art. 6, apartado 1, y del anexo I del Reglamento de IA (vía de los productos sanitarios), no del anexo III.",
  ],

  // Policies
  ["AI Usage Policy - Healthcare", "Política de uso de la IA - Sanidad"],
  [
    "Governs the acceptable use of AI systems in healthcare operations",
    "Regula el uso aceptable de los sistemas de IA en las operaciones sanitarias",
  ],
  [
    "This policy establishes strict guidelines for AI system usage in healthcare settings. All AI systems must be registered, risk-classified, and approved through human oversight gates before clinical deployment.\n\nAI systems must never replace clinical judgment — they serve as decision support tools only. Clinicians retain full responsibility for all patient care decisions. All AI-generated recommendations must be reviewed by qualified healthcare professionals before acting on them.\n\nAI systems processing patient data must comply with HIPAA, GDPR (for EU patients), and applicable medical device regulations. Regular validation against clinical outcomes is mandatory.",
    "Esta política establece directrices estrictas para el uso de sistemas de IA en entornos sanitarios. Todos los sistemas de IA deben estar registrados, clasificados según su riesgo y aprobados mediante puntos de control de supervisión humana antes de su despliegue clínico.\n\nLos sistemas de IA nunca deben sustituir el juicio clínico: sirven únicamente como herramientas de apoyo a la decisión. Los profesionales clínicos conservan la plena responsabilidad de todas las decisiones asistenciales. Todas las recomendaciones generadas por IA deben ser revisadas por profesionales sanitarios cualificados antes de actuar conforme a ellas.\n\nLos sistemas de IA que traten datos de pacientes deben cumplir la HIPAA, el RGPD (para los pacientes de la UE) y la normativa aplicable sobre productos sanitarios. La validación periódica frente a los resultados clínicos es obligatoria.",
  ],
  ["AI Ethics Policy - Healthcare", "Política de ética de la IA - Sanidad"],
  [
    "Ethical principles governing AI use in patient care",
    "Principios éticos que rigen el uso de la IA en la atención a los pacientes",
  ],
  [
    "This policy establishes ethical principles for AI in healthcare. Patient safety is the paramount concern — no AI system shall be deployed if there is reasonable evidence it could compromise patient safety.\n\nAI systems must be designed and validated to perform equitably across patient demographics. Bias testing across age, gender, ethnicity, and socioeconomic factors is mandatory before deployment. Systems showing disparate performance must be remediated or withdrawn.\n\nPatients have the right to know when AI is involved in their care, to understand how AI recommendations are generated, and to request purely human-driven care pathways when available.",
    "Esta política establece principios éticos para la IA en la asistencia sanitaria. La seguridad del paciente es la preocupación primordial: no se desplegará ningún sistema de IA si existen indicios razonables de que podría comprometer la seguridad del paciente.\n\nLos sistemas de IA deben diseñarse y validarse para funcionar de forma equitativa en los distintos grupos demográficos de pacientes. Las pruebas de sesgo en función de la edad, el género, el origen étnico y los factores socioeconómicos son obligatorias antes del despliegue. Los sistemas que muestren un rendimiento dispar deben corregirse o retirarse.\n\nLos pacientes tienen derecho a saber cuándo interviene la IA en su atención, a comprender cómo se generan las recomendaciones de la IA y a solicitar itinerarios asistenciales exclusivamente humanos cuando estén disponibles.",
  ],
  ["AI Risk Management Policy - Healthcare", "Política de gestión de riesgos de la IA - Sanidad"],
  [
    "Risk management framework for healthcare AI systems",
    "Marco de gestión de riesgos para los sistemas de IA sanitarios",
  ],
  [
    "This policy establishes the risk management framework for AI systems in healthcare. All AI systems must undergo comprehensive risk assessment using the FRIA (Fundamental Rights Impact Assessment) methodology before deployment.\n\nHigh-risk systems require conformity assessment, continuous monitoring of clinical outcomes, and incident reporting within 24 hours of any adverse event potentially linked to AI malfunction. Regular model performance audits must be conducted quarterly.\n\nA dedicated AI oversight committee reviews all high-risk AI deployments and has authority to suspend any system that poses unacceptable risk to patient safety.",
    "Esta política establece el marco de gestión de riesgos para los sistemas de IA en la asistencia sanitaria. Antes de su despliegue, todos los sistemas de IA deben someterse a una evaluación de riesgos exhaustiva conforme a la metodología FRIA (evaluación de impacto sobre los derechos fundamentales).\n\nLos sistemas de alto riesgo requieren una evaluación de la conformidad, un seguimiento continuo de los resultados clínicos y la notificación de incidentes en un plazo de 24 horas desde cualquier acontecimiento adverso posiblemente vinculado a un mal funcionamiento de la IA. Deben realizarse trimestralmente auditorías periódicas del rendimiento de los modelos.\n\nUn comité específico de supervisión de la IA revisa todos los despliegues de IA de alto riesgo y está facultado para suspender cualquier sistema que suponga un riesgo inaceptable para la seguridad del paciente.",
  ],

  // ──────────────────────────────────────────────────
  // FINANCIAL SERVICES
  // ──────────────────────────────────────────────────
  ["Financial Services", "Servicios financieros"],
  [
    "AI systems in banking and financial services: credit scoring, fraud detection, AML monitoring, robo-advisory, and customer support.",
    "Sistemas de IA en la banca y los servicios financieros: calificación crediticia, detección de fraude, vigilancia para la prevención del blanqueo de capitales, asesoramiento automatizado y atención al cliente.",
  ],

  // AI Credit Scoring System
  ["AI Credit Scoring System", "Sistema de calificación crediticia con IA"],
  [
    "Machine learning system evaluating creditworthiness of natural persons based on financial history, behavioral data, and alternative data sources.",
    "Sistema de aprendizaje automático que evalúa la solvencia de personas físicas a partir de su historial financiero, datos de comportamiento y fuentes de datos alternativas.",
  ],
  [
    "Evaluate creditworthiness of natural persons for lending decisions, credit limit adjustments, and loan pricing",
    "Evaluar la solvencia de personas físicas para las decisiones de concesión de crédito, los ajustes de límites de crédito y la fijación del precio de los préstamos",
  ],
  [
    "EU AI Act Annex III 5(b) explicitly lists AI systems intended to evaluate the creditworthiness of natural persons or establish their credit score as high-risk (fraud-detection systems are excluded from that point). Decisions directly affect individuals' access to financial services. Requires explainability, bias testing, and human oversight.",
    "El punto 5, letra b), del anexo III del Reglamento de IA incluye expresamente como de alto riesgo los sistemas de IA destinados a evaluar la solvencia de personas físicas o a establecer su calificación crediticia (los sistemas de detección de fraude quedan excluidos de ese punto). Las decisiones afectan directamente al acceso de las personas a los servicios financieros. Requiere explicabilidad, pruebas de sesgo y supervisión humana.",
  ],

  // Financial Fraud Detection
  ["Financial Fraud Detection", "Detección de fraude financiero"],
  [
    "Real-time AI system monitoring transactions for fraudulent patterns, anomalous behavior, and suspicious activities.",
    "Sistema de IA en tiempo real que vigila las transacciones en busca de patrones fraudulentos, comportamientos anómalos y actividades sospechosas.",
  ],
  [
    "Detect and prevent financial fraud in real-time by analyzing transaction patterns, behavioral biometrics, and account activity",
    "Detectar e impedir el fraude financiero en tiempo real mediante el análisis de los patrones de las transacciones, la biometría del comportamiento y la actividad de las cuentas",
  ],
  [
    "NOT high-risk under the EU AI Act: Annex III 5(b) expressly excludes 'AI systems used for the purpose of detecting financial fraud' from the creditworthiness listing. False positives can still deny access to financial services, so GDPR Art. 22 human-review mechanisms and internal monitoring remain essential.",
    "NO es de alto riesgo con arreglo al Reglamento de IA: el punto 5, letra b), del anexo III excluye expresamente de la categoría de solvencia «los sistemas de IA utilizados al objeto de detectar fraudes financieros». Aun así, los falsos positivos pueden denegar el acceso a servicios financieros, por lo que los mecanismos de revisión humana del art. 22 del RGPD y la vigilancia interna siguen siendo esenciales.",
  ],

  // Anti-Money Laundering Monitor
  ["Anti-Money Laundering Monitor", "Sistema de prevención del blanqueo de capitales"],
  [
    "AI system for detecting potential money laundering activities, suspicious transaction patterns, and sanctions screening.",
    "Sistema de IA para detectar posibles actividades de blanqueo de capitales y patrones de transacciones sospechosos, y para el filtrado frente a listas de sanciones.",
  ],
  [
    "Monitor transactions for potential money laundering, terrorist financing, and sanctions violations as required by regulatory obligations",
    "Vigilar las transacciones para detectar posibles casos de blanqueo de capitales, financiación del terrorismo e infracciones de sanciones, conforme a lo exigido por las obligaciones regulatorias",
  ],
  [
    "NOT high-risk under the EU AI Act: transaction monitoring by an obliged entity is not listed in Annex III (point 6 covers law-enforcement authorities, and point 5(b) concerns creditworthiness), consistent with this template's governance policy. It still triggers account restrictions and reports to financial intelligence units, so it stays under model risk management, AML rules on documentation and review, and GDPR Art. 22 human-review safeguards, with a pre-deployment validation gate.",
    "NO es de alto riesgo con arreglo al Reglamento de IA: el seguimiento de transacciones por un sujeto obligado no figura en el anexo III (el punto 6 se refiere a las autoridades garantes del cumplimiento del Derecho y el punto 5, letra b), a la solvencia), en coherencia con la política de gobernanza de esta plantilla. Aun así, da lugar a restricciones de cuentas y a comunicaciones a las unidades de inteligencia financiera, por lo que sigue sujeto a la gestión del riesgo de modelo, a las normas de prevención del blanqueo de capitales sobre documentación y revisión y a las garantías de revisión humana del art. 22 del RGPD, con un punto de control de validación previo al despliegue.",
  ],

  // Robo-Advisory Platform
  ["Robo-Advisory Platform", "Plataforma de asesoramiento automatizado"],
  [
    "AI-driven investment advisory system providing automated portfolio management, asset allocation, and investment recommendations.",
    "Sistema de asesoramiento en materia de inversión basado en IA que ofrece gestión automatizada de carteras, asignación de activos y recomendaciones de inversión.",
  ],
  [
    "Provide automated investment advice and portfolio management based on client risk profiles and market conditions",
    "Prestar asesoramiento automatizado en materia de inversión y gestión de carteras en función de los perfiles de riesgo de los clientes y de las condiciones del mercado",
  ],
  [
    "Advisory system with transparency obligations. While it influences financial decisions, clients maintain control over investment execution. MiFID II suitability requirements apply alongside AI transparency obligations.",
    "Sistema de asesoramiento sujeto a obligaciones de transparencia. Aunque influye en decisiones financieras, los clientes mantienen el control sobre la ejecución de las inversiones. Los requisitos de idoneidad de MiFID II se aplican junto con las obligaciones de transparencia en materia de IA.",
  ],

  // Banking Support Bot
  ["Banking Support Bot", "Bot de atención bancaria"],
  [
    "Conversational AI for customer banking inquiries, account information, and basic transaction support.",
    "IA conversacional para las consultas bancarias de los clientes, la información sobre cuentas y la ayuda con operaciones básicas.",
  ],
  [
    "Handle routine customer banking inquiries, provide account information, and assist with basic transactions",
    "Atender las consultas bancarias habituales de los clientes, facilitar información sobre las cuentas y ayudar con operaciones básicas",
  ],
  [
    "Customer-facing AI system with transparency obligations under EU AI Act Art. 50. Must disclose AI nature to customers. Handles sensitive financial data requiring appropriate access controls.",
    "Sistema de IA de cara al cliente sujeto a obligaciones de transparencia con arreglo al art. 50 del Reglamento de IA. Debe revelar a los clientes que se trata de una IA. Trata datos financieros sensibles que requieren controles de acceso adecuados.",
  ],

  // Policies
  ["AI Governance Policy - Financial Services", "Política de gobernanza de la IA - Servicios financieros"],
  [
    "Comprehensive AI governance framework for financial institutions",
    "Marco integral de gobernanza de la IA para entidades financieras",
  ],
  [
    "This policy establishes the AI governance framework for our financial institution. An AI Governance Committee, reporting to the Board Risk Committee, oversees all AI deployments and sets risk appetite for AI usage.\n\nAll AI systems must be classified under the EU AI Act risk framework. High-risk systems (e.g. credit scoring under Annex III 5(b)) require conformity assessment, ongoing monitoring, and quarterly model validation. Fraud-detection and AML monitoring systems fall outside Annex III high-risk (the 5(b) financial-fraud carve-out) but remain subject to model risk management and GDPR Art. 22 human-review safeguards. Model risk management follows supervisory expectations from ECB/EBA guidelines.\n\nAI models must undergo independent validation before production deployment. Model documentation must include intended use, training data descriptions, performance metrics, known limitations, and bias testing results.",
    "Esta política establece el marco de gobernanza de la IA de nuestra entidad financiera. Un Comité de Gobernanza de la IA, que depende del Comité de Riesgos del Consejo de Administración, supervisa todos los despliegues de IA y fija el apetito de riesgo para el uso de la IA.\n\nTodos los sistemas de IA deben clasificarse conforme al marco de riesgos del Reglamento de IA. Los sistemas de alto riesgo (por ejemplo, la calificación crediticia del punto 5, letra b), del anexo III) requieren una evaluación de la conformidad, un seguimiento continuo y una validación trimestral de los modelos. Los sistemas de detección de fraude y de vigilancia para la prevención del blanqueo de capitales quedan fuera del alto riesgo del anexo III, en virtud de la excepción relativa al fraude financiero del punto 5, letra b), pero siguen sujetos a la gestión del riesgo de modelo y a las garantías de revisión humana del art. 22 del RGPD. La gestión del riesgo de modelo sigue las expectativas supervisoras de las directrices del BCE/ABE.\n\nLos modelos de IA deben someterse a una validación independiente antes de su despliegue en producción. La documentación de los modelos debe incluir el uso previsto, la descripción de los datos de entrenamiento, las métricas de rendimiento, las limitaciones conocidas y los resultados de las pruebas de sesgo.",
  ],
  ["AI Risk Management Policy - Financial Services", "Política de gestión de riesgos de la IA - Servicios financieros"],
  [
    "Risk management framework for AI systems in financial services",
    "Marco de gestión de riesgos para los sistemas de IA en los servicios financieros",
  ],
  [
    "This policy defines the risk management framework for AI systems. All AI models are subject to the three lines of defense: first line (model owners), second line (model risk management), and third line (internal audit).\n\nModel risk is assessed across five dimensions: accuracy, stability, bias/fairness, explainability, and cybersecurity. High-risk models undergo stress testing, sensitivity analysis, and champion-challenger validation. Models exceeding risk thresholds require remediation within 30 days.\n\nIncident management requires immediate notification of the AI Governance Committee for any model failure affecting customer outcomes, regulatory compliance, or financial loss exceeding defined thresholds.",
    "Esta política define el marco de gestión de riesgos para los sistemas de IA. Todos los modelos de IA están sujetos a las tres líneas de defensa: primera línea (propietarios de los modelos), segunda línea (gestión del riesgo de modelo) y tercera línea (auditoría interna).\n\nEl riesgo de modelo se evalúa en cinco dimensiones: exactitud, estabilidad, sesgo/equidad, explicabilidad y ciberseguridad. Los modelos de alto riesgo se someten a pruebas de resistencia, análisis de sensibilidad y validación campeón-retador. Los modelos que superen los umbrales de riesgo deben corregirse en un plazo de 30 días.\n\nLa gestión de incidentes exige la notificación inmediata al Comité de Gobernanza de la IA de cualquier fallo de un modelo que afecte a los resultados para los clientes o al cumplimiento normativo, o que ocasione pérdidas económicas superiores a los umbrales definidos.",
  ],
  ["AI Transparency Policy - Financial Services", "Política de transparencia de la IA - Servicios financieros"],
  [
    "Transparency requirements for AI-driven financial decisions",
    "Requisitos de transparencia para las decisiones financieras basadas en IA",
  ],
  [
    "This policy ensures transparency in AI-driven financial decisions. Customers have the right to explanation for any AI-influenced decision that significantly affects them, including credit decisions, fraud alerts, and investment recommendations.\n\nExplainability requirements are tiered by risk level: HIGH-risk systems must provide individualized explanations of key decision factors; LIMITED-risk systems must disclose AI involvement and provide general information about the decision logic.\n\nRegulatory reporting on AI usage, model performance, and fairness metrics is published annually. The AI model inventory is maintained with full lineage tracking from development through retirement.",
    "Esta política garantiza la transparencia en las decisiones financieras basadas en IA. Los clientes tienen derecho a una explicación de cualquier decisión en la que haya influido la IA y que les afecte de manera significativa, incluidas las decisiones de crédito, las alertas de fraude y las recomendaciones de inversión.\n\nLos requisitos de explicabilidad se escalonan según el nivel de riesgo: los sistemas de riesgo ALTO deben ofrecer explicaciones individualizadas de los factores clave de la decisión; los sistemas de riesgo LIMITADO deben informar de la intervención de la IA y ofrecer información general sobre la lógica de la decisión.\n\nLa información regulatoria sobre el uso de la IA, el rendimiento de los modelos y las métricas de equidad se publica anualmente. El inventario de modelos de IA se mantiene con una trazabilidad completa del linaje desde el desarrollo hasta la retirada.",
  ],

  // ──────────────────────────────────────────────────
  // SAAS / TECHNOLOGY
  // ──────────────────────────────────────────────────
  ["SaaS / Technology", "SaaS / Tecnología"],
  [
    "AI systems common in technology companies: code assistants, content generation, analytics AI, chatbots, and AI-powered search.",
    "Sistemas de IA habituales en las empresas tecnológicas: asistentes de código, generación de contenidos, IA analítica, chatbots y búsqueda con IA.",
  ],

  // AI Code Assistant
  ["AI Code Assistant", "Asistente de código con IA"],
  [
    "AI-powered code completion, review, and generation tool used by the development team.",
    "Herramienta con IA de autocompletado, revisión y generación de código que utiliza el equipo de desarrollo.",
  ],
  [
    "Accelerate software development through AI-powered code suggestions, code review assistance, and automated documentation",
    "Agilizar el desarrollo de software mediante sugerencias de código con IA, ayuda en la revisión de código y documentación automatizada",
  ],
  [
    "Generative AI system with transparency obligations. Code may inadvertently contain or generate references to personal data. Intellectual property and code security considerations apply. Low direct risk to individuals.",
    "Sistema de IA generativa sujeto a obligaciones de transparencia. El código puede contener o generar de forma involuntaria referencias a datos personales. Deben tenerse en cuenta aspectos de propiedad intelectual y de seguridad del código. Riesgo directo bajo para las personas.",
  ],

  // AI Content Generator
  ["AI Content Generator", "Generador de contenidos con IA"],
  [
    "Generative AI platform for creating marketing copy, documentation, blog posts, and communication materials.",
    "Plataforma de IA generativa para crear textos de marketing, documentación, artículos de blog y materiales de comunicación.",
  ],
  [
    "Generate marketing content, documentation, and communications to improve content production efficiency",
    "Generar contenidos de marketing, documentación y comunicaciones para mejorar la eficiencia en la producción de contenidos",
  ],
  [
    "Content generation AI with transparency obligations under EU AI Act Art. 50. AI-generated content must be labeled as such. Risk of hallucination, copyright issues, and brand misrepresentation.",
    "IA de generación de contenidos sujeta a obligaciones de transparencia con arreglo al art. 50 del Reglamento de IA. El contenido generado por IA debe etiquetarse como tal. Riesgo de alucinaciones, problemas de derechos de autor y representación inexacta de la marca.",
  ],

  // Product Analytics AI
  ["Product Analytics AI", "IA de analítica de producto"],
  [
    "AI system analyzing product usage patterns, user behavior, and engagement metrics to drive product decisions.",
    "Sistema de IA que analiza los patrones de uso del producto, el comportamiento de los usuarios y las métricas de interacción para orientar las decisiones de producto.",
  ],
  [
    "Analyze product usage patterns and user behavior to inform product development decisions and improve user experience",
    "Analizar los patrones de uso del producto y el comportamiento de los usuarios para fundamentar las decisiones de desarrollo del producto y mejorar la experiencia de usuario",
  ],
  [
    "Analytics system that provides aggregate insights for product teams. Does not make individual-level decisions. Standard data protection obligations apply for personal data processing.",
    "Sistema analítico que ofrece información agregada a los equipos de producto. No adopta decisiones a nivel individual. Al tratamiento de datos personales se le aplican las obligaciones habituales de protección de datos.",
  ],

  // Customer Support Chatbot (SaaS variant; the name is shared with e-commerce)
  [
    "AI chatbot handling customer support inquiries, ticket routing, and knowledge base interactions.",
    "Chatbot de IA que gestiona las consultas de soporte de los clientes, la asignación de incidencias y las interacciones con la base de conocimiento.",
  ],
  [
    "Provide automated first-line customer support, handle common inquiries, and route complex issues to human agents",
    "Prestar un soporte al cliente automatizado de primer nivel, atender las consultas habituales y derivar las cuestiones complejas a agentes humanos",
  ],
  [
    "Conversational AI system with transparency obligations. Must disclose AI nature to users. Processes customer data including support inquiries that may contain sensitive information.",
    "Sistema de IA conversacional sujeto a obligaciones de transparencia. Debe revelar a los usuarios que se trata de una IA. Trata datos de clientes, incluidas consultas de soporte que pueden contener información sensible.",
  ],

  // AI-Powered Search
  ["AI-Powered Search", "Búsqueda con IA"],
  [
    "Semantic search system using embeddings and NLP for documentation, knowledge base, and product search.",
    "Sistema de búsqueda semántica que utiliza representaciones vectoriales (embeddings) y procesamiento del lenguaje natural para buscar en la documentación, la base de conocimiento y los productos.",
  ],
  [
    "Provide intelligent search across product documentation and knowledge base using semantic understanding",
    "Ofrecer una búsqueda inteligente en la documentación del producto y la base de conocimiento mediante comprensión semántica",
  ],
  [
    "Search functionality that processes queries without making decisions affecting individuals. Minimal risk classification as it serves as a utility function.",
    "Funcionalidad de búsqueda que trata consultas sin adoptar decisiones que afecten a las personas. Se clasifica como de riesgo mínimo porque desempeña una función auxiliar.",
  ],

  // Policies
  ["AI Usage Policy - Technology", "Política de uso de la IA - Tecnología"],
  [
    "Guidelines for responsible AI usage across technology operations",
    "Directrices para el uso responsable de la IA en todas las operaciones tecnológicas",
  ],
  [
    "This policy governs the use of AI tools and systems across our technology organization. All AI systems must be registered in the AI Registry before use, whether internally developed or third-party. Employees must complete AI awareness training before using generative AI tools.\n\nCode assistants may be used for development acceleration but all AI-generated code must undergo standard code review. Confidential code, customer data, and proprietary algorithms must not be shared with external AI services without approval. AI-generated content must be reviewed for accuracy and labeled as AI-assisted.\n\nTeams are encouraged to innovate with AI but must follow the registration and risk assessment process for any new AI tool or use case before deployment.",
    "Esta política regula el uso de herramientas y sistemas de IA en toda nuestra organización tecnológica. Todos los sistemas de IA deben inscribirse en el Registro de IA antes de su uso, tanto si se han desarrollado internamente como si son de terceros. Los empleados deben completar la formación de concienciación sobre IA antes de utilizar herramientas de IA generativa.\n\nLos asistentes de código pueden utilizarse para agilizar el desarrollo, pero todo el código generado por IA debe someterse a la revisión de código habitual. El código confidencial, los datos de clientes y los algoritmos propios no deben compartirse con servicios de IA externos sin aprobación. El contenido generado por IA debe revisarse para comprobar su exactitud y etiquetarse como elaborado con ayuda de IA.\n\nSe anima a los equipos a innovar con la IA, pero deben seguir el proceso de registro y evaluación de riesgos para cualquier nueva herramienta o caso de uso de IA antes de su despliegue.",
  ],
  ["AI Data Governance Policy - Technology", "Política de gobernanza de datos de la IA - Tecnología"],
  [
    "Data governance requirements for AI system inputs and outputs",
    "Requisitos de gobernanza de datos para las entradas y salidas de los sistemas de IA",
  ],
  [
    "This policy establishes data governance requirements for all AI systems. Data used for AI training, fine-tuning, or inference must be inventoried, classified, and processed in accordance with data protection regulations.\n\nCustomer data may only be processed through AI systems that have been approved through the risk assessment process. Data retention for AI purposes follows the organization's data retention schedule. Personal data used for model training requires a valid legal basis and must be documented.\n\nAI model outputs that reference or contain personal data must be treated with the same classification as the input data. Data minimization principles apply — only necessary data should be provided to AI systems.",
    "Esta política establece requisitos de gobernanza de datos para todos los sistemas de IA. Los datos utilizados para el entrenamiento, el ajuste fino o la inferencia de la IA deben inventariarse, clasificarse y tratarse de conformidad con la normativa de protección de datos.\n\nLos datos de clientes solo pueden tratarse mediante sistemas de IA que hayan sido aprobados a través del proceso de evaluación de riesgos. La conservación de datos con fines de IA se rige por el calendario de conservación de datos de la organización. Los datos personales utilizados para el entrenamiento de modelos requieren una base jurídica válida y deben documentarse.\n\nLas salidas de los modelos de IA que hagan referencia a datos personales o los contengan deben tratarse con la misma clasificación que los datos de entrada. Se aplican los principios de minimización de datos: solo deben facilitarse a los sistemas de IA los datos necesarios.",
  ],

  // ──────────────────────────────────────────────────
  // MANUFACTURING
  // ──────────────────────────────────────────────────
  ["Manufacturing", "Industria manufacturera"],
  [
    "AI systems in manufacturing: predictive maintenance, quality inspection, supply chain optimization, and safety monitoring.",
    "Sistemas de IA en la industria manufacturera: mantenimiento predictivo, inspección de calidad, optimización de la cadena de suministro y vigilancia de la seguridad.",
  ],

  // Predictive Maintenance System
  ["Predictive Maintenance System", "Sistema de mantenimiento predictivo"],
  [
    "AI system analyzing sensor data from manufacturing equipment to predict failures and optimize maintenance schedules.",
    "Sistema de IA que analiza los datos de los sensores de los equipos de fabricación para predecir averías y optimizar los calendarios de mantenimiento.",
  ],
  [
    "Predict equipment failures and optimize maintenance schedules to reduce downtime and maintenance costs",
    "Predecir las averías de los equipos y optimizar los calendarios de mantenimiento para reducir los tiempos de inactividad y los costes de mantenimiento",
  ],
  [
    "Industrial AI system processing equipment sensor data. Does not directly affect individuals. Transparency obligations apply regarding AI-driven maintenance decisions. Failure could affect production but not safety-critical.",
    "Sistema de IA industrial que trata datos de los sensores de los equipos. No afecta directamente a las personas. Se aplican obligaciones de transparencia respecto de las decisiones de mantenimiento basadas en IA. Un fallo podría afectar a la producción, pero no es crítico para la seguridad.",
  ],

  // AI Quality Inspection
  ["AI Quality Inspection", "Inspección de calidad con IA"],
  [
    "Computer vision system for automated quality control, defect detection, and product inspection on production lines.",
    "Sistema de visión artificial para el control de calidad automatizado, la detección de defectos y la inspección de productos en las líneas de producción.",
  ],
  [
    "Automate visual quality inspection to detect defects, ensure product consistency, and reduce manual inspection costs",
    "Automatizar la inspección visual de calidad para detectar defectos, garantizar la uniformidad de los productos y reducir los costes de inspección manual",
  ],
  [
    "Quality control AI system processing product images. Does not process personal data or make decisions affecting individuals. Product safety implications require monitoring but standard risk classification applies.",
    "Sistema de IA de control de calidad que trata imágenes de productos. No trata datos personales ni adopta decisiones que afecten a las personas. Sus implicaciones para la seguridad de los productos exigen un seguimiento, pero se aplica la clasificación de riesgo habitual.",
  ],

  // Supply Chain Optimizer
  ["Supply Chain Optimizer", "Optimizador de la cadena de suministro"],
  [
    "AI system optimizing supply chain logistics, inventory management, and demand forecasting.",
    "Sistema de IA que optimiza la logística de la cadena de suministro, la gestión de existencias y la previsión de la demanda.",
  ],
  [
    "Optimize supply chain operations through demand forecasting, inventory optimization, and logistics planning",
    "Optimizar las operaciones de la cadena de suministro mediante la previsión de la demanda, la optimización de existencias y la planificación logística",
  ],
  [
    "Operational optimization AI that processes business data for logistics decisions. No direct impact on individuals. Standard monitoring for business performance accuracy.",
    "IA de optimización operativa que trata datos empresariales para adoptar decisiones logísticas. Sin repercusión directa en las personas. Seguimiento habitual de la exactitud en cuanto al rendimiento empresarial.",
  ],

  // Worker Safety Monitor
  ["Worker Safety Monitor", "Vigilancia de la seguridad de los trabajadores"],
  [
    "AI-powered safety monitoring system using cameras and sensors to detect safety hazards, PPE compliance, and unsafe behaviors.",
    "Sistema de vigilancia de la seguridad con IA que utiliza cámaras y sensores para detectar peligros para la seguridad, el cumplimiento en el uso de EPI y comportamientos inseguros.",
  ],
  [
    "Monitor workplace safety conditions, detect hazards, and ensure compliance with safety protocols to prevent workplace injuries",
    "Vigilar las condiciones de seguridad en el lugar de trabajo, detectar peligros y garantizar el cumplimiento de los protocolos de seguridad para prevenir lesiones laborales",
  ],
  [
    "EU AI Act Annex III Section 4 covers AI systems used in employment and worker management. Worker monitoring systems that can identify individuals and affect their employment conditions are high-risk. Privacy impact on workers requires careful human oversight.",
    "El punto 4 del anexo III del Reglamento de IA abarca los sistemas de IA utilizados en el empleo y la gestión de los trabajadores. Los sistemas de vigilancia de los trabajadores que pueden identificar a personas y afectar a sus condiciones laborales son de alto riesgo. La repercusión en la privacidad de los trabajadores exige una supervisión humana cuidadosa.",
  ],

  // Policies
  ["AI Usage Policy - Manufacturing", "Política de uso de la IA - Industria manufacturera"],
  [
    "Guidelines for AI usage in manufacturing operations",
    "Directrices para el uso de la IA en las operaciones de fabricación",
  ],
  [
    "This policy establishes guidelines for AI usage in manufacturing. All AI systems deployed on the factory floor must be registered, risk-assessed, and approved before operational use. Safety-critical AI systems require additional review by the HSE (Health, Safety & Environment) team.\n\nWorker-facing AI systems (safety monitoring, performance analytics) must comply with worker consultation requirements and data protection regulations. Workers must be informed about AI monitoring and its purposes. AI systems must not be used for covert surveillance.\n\nPredictive maintenance and quality inspection systems must have defined fallback procedures for when AI systems are unavailable or produce uncertain results.",
    "Esta política establece directrices para el uso de la IA en la fabricación. Todos los sistemas de IA desplegados en planta deben estar registrados, contar con una evaluación de riesgos y estar aprobados antes de su uso operativo. Los sistemas de IA críticos para la seguridad requieren una revisión adicional por parte del equipo de HSE (salud, seguridad y medio ambiente).\n\nLos sistemas de IA que afectan a los trabajadores (vigilancia de la seguridad, analítica del rendimiento) deben cumplir los requisitos de consulta a los trabajadores y la normativa de protección de datos. Debe informarse a los trabajadores sobre la vigilancia mediante IA y sus finalidades. Los sistemas de IA no deben utilizarse para la vigilancia encubierta.\n\nLos sistemas de mantenimiento predictivo y de inspección de calidad deben contar con procedimientos alternativos definidos para cuando los sistemas de IA no estén disponibles o produzcan resultados inciertos.",
  ],
  ["AI Risk Management Policy - Manufacturing", "Política de gestión de riesgos de la IA - Industria manufacturera"],
  [
    "Risk management for manufacturing AI systems",
    "Gestión de riesgos de los sistemas de IA en la fabricación",
  ],
  [
    "This policy defines the risk management approach for AI in manufacturing. Safety-critical AI systems (worker safety monitoring, equipment safety) undergo enhanced risk assessment including failure mode analysis, edge case testing, and environmental condition validation.\n\nHigh-risk systems require pre-deployment conformity assessment, continuous monitoring dashboards, and quarterly performance reviews. Incident reporting is mandatory within 24 hours for any AI system failure that could have contributed to a safety event.\n\nModel drift monitoring is required for all production AI systems. Performance degradation beyond defined thresholds triggers automatic alerts and human review before continued operation.",
    "Esta política define el enfoque de gestión de riesgos para la IA en la fabricación. Los sistemas de IA críticos para la seguridad (vigilancia de la seguridad de los trabajadores, seguridad de los equipos) se someten a una evaluación de riesgos reforzada que incluye el análisis de modos de fallo, pruebas de casos límite y la validación en distintas condiciones ambientales.\n\nLos sistemas de alto riesgo requieren una evaluación de la conformidad previa al despliegue, paneles de seguimiento continuo y revisiones trimestrales del rendimiento. La notificación de incidentes es obligatoria en un plazo de 24 horas para cualquier fallo de un sistema de IA que haya podido contribuir a un suceso relacionado con la seguridad.\n\nEl seguimiento de la deriva de los modelos es obligatorio para todos los sistemas de IA en producción. Una degradación del rendimiento que supere los umbrales definidos activa alertas automáticas y una revisión humana antes de que el sistema siga funcionando.",
  ],

  // ──────────────────────────────────────────────────
  // PROFESSIONAL SERVICES
  // ──────────────────────────────────────────────────
  ["Professional Services", "Servicios profesionales"],
  [
    "AI systems in consulting, legal, and professional services: document analysis, contract review, knowledge management, and meeting summaries.",
    "Sistemas de IA en la consultoría, los servicios jurídicos y los servicios profesionales: análisis documental, revisión de contratos, gestión del conocimiento y resúmenes de reuniones.",
  ],

  // AI Document Analysis
  ["AI Document Analysis", "Análisis documental con IA"],
  [
    "AI system for analyzing, summarizing, and extracting insights from large document sets, reports, and research materials.",
    "Sistema de IA para analizar, resumir y extraer conclusiones de grandes conjuntos de documentos, informes y materiales de investigación.",
  ],
  [
    "Analyze and summarize documents, extract key information, and support knowledge discovery across large document collections",
    "Analizar y resumir documentos, extraer información clave y facilitar el descubrimiento de conocimiento en grandes colecciones documentales",
  ],
  [
    "Document analysis AI that may process documents containing personal data. Transparency obligations apply. Risk depends on the sensitivity of documents processed and whether outputs influence decisions affecting individuals.",
    "IA de análisis documental que puede tratar documentos que contienen datos personales. Se aplican obligaciones de transparencia. El riesgo depende de la sensibilidad de los documentos tratados y de si los resultados influyen en decisiones que afectan a las personas.",
  ],

  // AI Contract Review
  ["AI Contract Review", "Revisión de contratos con IA"],
  [
    "AI-powered contract analysis tool that identifies risks, clauses, obligations, and compliance issues in legal agreements.",
    "Herramienta de análisis de contratos con IA que identifica riesgos, cláusulas, obligaciones y cuestiones de cumplimiento normativo en los acuerdos jurídicos.",
  ],
  [
    "Assist legal teams in reviewing contracts by identifying key clauses, risks, deviations from standards, and compliance obligations",
    "Ayudar a los equipos jurídicos en la revisión de contratos mediante la identificación de cláusulas clave, riesgos, desviaciones respecto de los estándares y obligaciones de cumplimiento normativo",
  ],
  [
    "Legal AI tool that supports but does not replace legal judgment. Transparency obligations apply. Risk mitigated by human legal review of all AI-identified items. Contracts may contain personal data requiring data protection measures.",
    "Herramienta jurídica de IA que respalda el criterio jurídico, pero no lo sustituye. Se aplican obligaciones de transparencia. El riesgo se mitiga mediante la revisión jurídica humana de todos los elementos identificados por la IA. Los contratos pueden contener datos personales que requieren medidas de protección de datos.",
  ],

  // Knowledge Management AI
  ["Knowledge Management AI", "IA de gestión del conocimiento"],
  [
    "AI-powered knowledge base that organizes institutional knowledge, answers questions, and surfaces relevant expertise.",
    "Base de conocimiento con IA que organiza el conocimiento institucional, responde a preguntas y pone de relieve la experiencia pertinente.",
  ],
  [
    "Organize and surface institutional knowledge to improve team productivity and knowledge sharing",
    "Organizar y poner a disposición el conocimiento institucional para mejorar la productividad de los equipos y el intercambio de conocimiento",
  ],
  [
    "Internal knowledge tool that assists with information retrieval. Does not make decisions affecting individuals. Minimal risk as it serves as a utility for internal productivity.",
    "Herramienta interna de conocimiento que ayuda a recuperar información. No adopta decisiones que afecten a las personas. Riesgo mínimo, ya que actúa como herramienta auxiliar para la productividad interna.",
  ],

  // AI Meeting Summarizer
  ["AI Meeting Summarizer", "Generador de resúmenes de reuniones con IA"],
  [
    "AI system that records, transcribes, and summarizes meetings, generating action items and key decisions.",
    "Sistema de IA que graba, transcribe y resume reuniones, y genera tareas de seguimiento y decisiones clave.",
  ],
  [
    "Automatically transcribe and summarize meetings to improve documentation and follow-up on action items",
    "Transcribir y resumir reuniones de forma automática para mejorar la documentación y el seguimiento de las tareas acordadas",
  ],
  [
    "Meeting recording AI with consent and notification requirements. Processes voice data (personal data) but does not make decisions affecting individuals. Participants must be informed of recording and AI processing.",
    "IA de grabación de reuniones sujeta a requisitos de consentimiento y notificación. Trata datos de voz (datos personales), pero no adopta decisiones que afecten a las personas. Debe informarse a los participantes de la grabación y del tratamiento mediante IA.",
  ],

  // Policies
  ["AI Usage Policy - Professional Services", "Política de uso de la IA - Servicios profesionales"],
  [
    "Guidelines for AI tool usage in professional services",
    "Directrices para el uso de herramientas de IA en los servicios profesionales",
  ],
  [
    "This policy governs AI usage across our professional services practice. All AI tools must be registered and approved before use with client work. Client confidentiality must be maintained — client data must not be shared with external AI services without explicit client consent and contractual authorization.\n\nAI-generated analysis, advice, and deliverables must be reviewed by qualified professionals before delivery to clients. AI tools are aids to professional judgment, not replacements. Professionals remain accountable for all work product regardless of AI involvement.\n\nMeeting recording and transcription tools require participant notification and consent. Recordings containing client information must follow the firm's data retention and confidentiality policies.",
    "Esta política regula el uso de la IA en toda nuestra práctica de servicios profesionales. Todas las herramientas de IA deben estar registradas y aprobadas antes de utilizarse en trabajos para clientes. Debe preservarse la confidencialidad de los clientes: los datos de los clientes no deben compartirse con servicios de IA externos sin el consentimiento expreso del cliente y una autorización contractual.\n\nLos análisis, el asesoramiento y los entregables generados por IA deben ser revisados por profesionales cualificados antes de su entrega a los clientes. Las herramientas de IA son un apoyo al criterio profesional, no un sustituto. Los profesionales siguen siendo responsables de todo el trabajo realizado, con independencia de la intervención de la IA.\n\nLas herramientas de grabación y transcripción de reuniones requieren informar a los participantes y obtener su consentimiento. Las grabaciones que contengan información de clientes deben ajustarse a las políticas de conservación de datos y de confidencialidad de la firma.",
  ],
  ["AI Data Governance Policy - Professional Services", "Política de gobernanza de datos de la IA - Servicios profesionales"],
  [
    "Data governance for AI processing in professional services",
    "Gobernanza de datos para el tratamiento mediante IA en los servicios profesionales",
  ],
  [
    "This policy establishes data governance for AI systems processing professional services data. Client engagement data, work product, and confidential information must be classified before processing through AI systems.\n\nAI systems must maintain information barriers between client engagements. Cross-client data processing through AI is prohibited unless anonymized and aggregated. Document analysis tools must be configured to prevent data leakage between client matters.\n\nRetention of AI-processed data follows the firm's records management policy. AI conversation histories and generated outputs must be retained or purged according to the applicable engagement retention schedule.",
    "Esta política establece la gobernanza de datos para los sistemas de IA que tratan datos de servicios profesionales. Los datos de los encargos de clientes, el trabajo realizado y la información confidencial deben clasificarse antes de tratarse mediante sistemas de IA.\n\nLos sistemas de IA deben mantener barreras de información entre los encargos de distintos clientes. Se prohíbe el tratamiento cruzado de datos de distintos clientes mediante IA, salvo que estén anonimizados y agregados. Las herramientas de análisis documental deben configurarse para impedir fugas de datos entre asuntos de distintos clientes.\n\nLa conservación de los datos tratados mediante IA se rige por la política de gestión documental de la firma. Los historiales de conversaciones con la IA y los resultados generados deben conservarse o eliminarse conforme al calendario de conservación aplicable al encargo.",
  ],
  ["AI Ethics Policy - Professional Services", "Política de ética de la IA - Servicios profesionales"],
  [
    "Ethical principles for AI use in professional advisory",
    "Principios éticos para el uso de la IA en el asesoramiento profesional",
  ],
  [
    "This policy establishes ethical principles for AI in professional services. Professionals must maintain competence in understanding AI capabilities and limitations relevant to their practice areas.\n\nAI must not be used to generate work that could mislead clients about the level of professional review applied. Clients must be informed when AI has been materially involved in producing deliverables. Billing transparency requires that AI-assisted efficiency gains are reflected appropriately.\n\nThe firm commits to using AI in ways that enhance rather than diminish the quality of professional judgment, uphold fiduciary duties, and maintain the trust that clients place in our expertise.",
    "Esta política establece principios éticos para la IA en los servicios profesionales. Los profesionales deben mantener la competencia necesaria para comprender las capacidades y limitaciones de la IA pertinentes para sus áreas de práctica.\n\nLa IA no debe utilizarse para generar trabajos que puedan inducir a error a los clientes sobre el nivel de revisión profesional aplicado. Debe informarse a los clientes cuando la IA haya intervenido de forma significativa en la elaboración de los entregables. La transparencia en la facturación exige que las mejoras de eficiencia obtenidas con ayuda de la IA se reflejen de forma adecuada.\n\nLa firma se compromete a utilizar la IA de manera que refuerce, en lugar de mermar, la calidad del criterio profesional, respete los deberes fiduciarios y mantenga la confianza que los clientes depositan en nuestra experiencia.",
  ],
  [
    "Media and Advertising",
    "Medios y publicidad",
  ],
  [
    "AI systems in publishing, advertising and marketing: audience modelling, generative creative, content recommendation and brand safety.",
    "Sistemas de IA en la edición, la publicidad y el marketing: modelización de audiencias, creatividades generativas, recomendación de contenidos y seguridad de marca.",
  ],
  [
    "Audience Segmentation and Lookalike Modelling",
    "Segmentación de audiencias y modelos de públicos similares",
  ],
  [
    "Model that groups people into audience segments and finds similar people from behavioural, purchase and contextual signals.",
    "Modelo que agrupa a las personas en segmentos de audiencia y encuentra personas similares a partir de señales de comportamiento, de compra y contextuales.",
  ],
  [
    "Build and extend advertising audiences so that campaigns reach people likely to find them relevant",
    "Construir y ampliar audiencias publicitarias para que las campañas lleguen a personas que probablemente las encuentren relevantes",
  ],
  [
    "Advertising audiences are not listed in Annex III, and the California rules expressly exclude advertising from the automated decisions they regulate. The exposure sits in data protection law instead: a segment that reveals or infers a sensitive characteristic, health above all, triggers opt-in consent in several US states and Art. 9 of the GDPR. Classify each segment before it is built.",
    "Las audiencias publicitarias no figuran en el anexo III, y la normativa de California excluye expresamente la publicidad de las decisiones automatizadas que regula. La exposición está en el derecho de protección de datos: un segmento que revele o infiera una característica sensible, sobre todo la salud, activa el consentimiento expreso en varios estados de EE. UU. y el art. 9 del RGPD. Clasifica cada segmento antes de construirlo.",
  ],
  [
    "Generative Ad Creative",
    "Creatividades publicitarias generativas",
  ],
  [
    "Generative system that produces advertising copy, images and video variants from a brief and a brand style guide.",
    "Sistema generativo que produce textos, imágenes y vídeos publicitarios a partir de un briefing y de un manual de marca.",
  ],
  [
    "Produce and vary advertising creative at the volume campaigns require, within brand and legal constraints",
    "Producir y variar creatividades publicitarias al volumen que exigen las campañas, dentro de los límites de marca y jurídicos",
  ],
  [
    "Synthetic audio, image, video or text must be marked in a machine-readable format so it can be detected as artificially generated (Art. 50(2)). Where creative depicts a real person or an existing work, likeness, endorsement and copyright clearance are separate questions the marking does not answer.",
    "El audio, las imágenes, el vídeo y el texto sintéticos deben marcarse en un formato legible por máquina para que pueda detectarse que se han generado artificialmente (art. 50, apartado 2). Cuando la creatividad muestre a una persona real o una obra existente, la imagen, el aval y los derechos de autor son cuestiones aparte que el marcado no resuelve.",
  ],
  [
    "Content Recommendation",
    "Recomendación de contenidos",
  ],
  [
    "Ranking system that orders articles, videos or products in a feed for each reader.",
    "Sistema de ordenación que coloca artículos, vídeos o productos en un muro personalizado para cada lector.",
  ],
  [
    "Order content so that readers find what is relevant to them and stay engaged with the publication",
    "Ordenar los contenidos para que cada lector encuentre lo que le resulta relevante y siga vinculado a la publicación",
  ],
  [
    "Recommendation is not an Annex III use. Obligations come from elsewhere: profiling under the GDPR, the right to object, and for a very large platform the separate transparency and non-profiling options of the Digital Services Act. Record which of those apply rather than assuming none do.",
    "La recomendación no es un uso del anexo III. Las obligaciones vienen de otro sitio: la elaboración de perfiles conforme al RGPD, el derecho de oposición y, para una plataforma de muy gran tamaño, los deberes de transparencia y la opción sin perfilado del Reglamento de Servicios Digitales. Deja constancia de cuáles se aplican en lugar de dar por hecho que ninguno.",
  ],
  [
    "Brand Safety and Content Classification",
    "Seguridad de marca y clasificación de contenidos",
  ],
  [
    "Classifier that labels pages and videos for advertiser suitability, and screens user-generated content before publication.",
    "Clasificador que etiqueta páginas y vídeos según su idoneidad para los anunciantes y revisa los contenidos de usuarios antes de su publicación.",
  ],
  [
    "Keep advertising away from unsuitable content and screen submissions before they are published",
    "Mantener la publicidad alejada de contenidos inadecuados y revisar los envíos antes de publicarlos",
  ],
  [
    "A classifier that suppresses lawful content affects expression, so the human review route matters more than the model's accuracy. Where it screens user submissions, the platform's own notice and appeal duties apply to the outcome.",
    "Un clasificador que suprime contenido lícito afecta a la libertad de expresión, así que la vía de revisión humana importa más que la precisión del modelo. Cuando revise envíos de usuarios, los deberes de notificación y recurso de la plataforma se aplican al resultado.",
  ],
  [
    "AI Usage Policy - Media and Advertising",
    "Política de uso de la IA: medios y publicidad",
  ],
  [
    "How AI may be used in editorial, creative and campaign work",
    "Cómo puede usarse la IA en el trabajo editorial, creativo y de campañas",
  ],
  [
    "This policy governs AI use across editorial, creative, campaign and audience work. Every AI tool used on client or reader data must be registered before use, with the contract that governs it recorded alongside it.\n\nEditorial judgement stays with people. AI may draft, summarise and vary, and a named person approves anything published. Where AI has materially produced a published piece, the publication says so in the way its style guide requires.\n\nCampaign teams may not promise an advertiser a targeting capability that legal and product have not approved. Segment names are evidence: a segment must be named for what it actually is, because its name will be read back in an investigation.",
    "Esta política regula el uso de la IA en el trabajo editorial, creativo, de campañas y de audiencias. Toda herramienta de IA que se utilice sobre datos de clientes o de lectores se registra antes de su uso, junto con el contrato que la rige.\n\nEl criterio editorial sigue siendo de las personas. La IA puede redactar, resumir y generar variantes, y una persona identificada aprueba todo lo que se publica. Cuando la IA haya producido de forma sustancial una pieza publicada, la publicación lo indica del modo que exija su libro de estilo.\n\nLos equipos de campañas no pueden prometer a un anunciante una capacidad de segmentación que el departamento jurídico y el de producto no hayan aprobado. Los nombres de los segmentos son prueba: un segmento debe llamarse por lo que realmente es, porque su nombre se leerá en voz alta en una investigación.",
  ],
  [
    "Sensitive Data in Advertising Policy",
    "Política de datos sensibles en publicidad",
  ],
  [
    "How the organisation decides whether advertising data is sensitive, and what follows",
    "Cómo decide la organización si un dato publicitario es sensible y qué se deriva de ello",
  ],
  [
    "This policy governs data used to build, extend and target advertising audiences. Before a segment or feed is used, it is classified through the five-factor analysis (source, content, use, consumer expectations, harm) and the result is recorded with its reasoning, an owner and a review date.\n\nA segment classified as high is treated as sensitive everywhere: opt-in consent where it can be obtained, suppression where it cannot, no sale or share, and a contract that binds every recipient. Health data receives particular care, because several US state laws reach health status inferred from ordinary purchase or browsing data, and one of them requires a signed authorisation to sell that is not achievable in programmatic advertising.\n\nContractual assurances from partners are not a substitute for diligence. Where the organisation has reason to believe a partner is not complying, it stops sending data to that partner until the position is resolved. Classifications are reviewed on a set cadence, because statutory definitions, industry practice and consumer expectations all move.",
    "Esta política regula los datos utilizados para construir, ampliar y segmentar audiencias publicitarias. Antes de usar un segmento o un flujo, se clasifica mediante el análisis de cinco factores (origen, contenido, uso, expectativas de la persona y perjuicio) y el resultado se registra con su razonamiento, un responsable y una fecha de revisión.\n\nUn segmento clasificado como alto se trata como sensible en todas partes: consentimiento expreso donde pueda obtenerse, supresión donde no, sin venta ni comunicación, y un contrato que vincule a cada destinatario. Los datos de salud reciben un cuidado particular, porque varias leyes estatales de EE. UU. alcanzan al estado de salud inferido a partir de datos corrientes de compra o de navegación, y una de ellas exige para la venta una autorización firmada que no es viable en la publicidad programática.\n\nLas garantías contractuales de los socios no sustituyen a la diligencia debida. Cuando la organización tenga motivos para creer que un socio no cumple, deja de enviarle datos hasta que se aclare la situación. Las clasificaciones se revisan con una periodicidad fijada, porque las definiciones legales, la práctica del sector y las expectativas de las personas cambian.",
  ],
  [
    "Synthetic Media and Disclosure Policy",
    "Política de medios sintéticos y divulgación",
  ],
  [
    "Marking generated content, and the limits of what marking solves",
    "Marcar el contenido generado, y los límites de lo que el marcado resuelve",
  ],
  [
    "This policy governs synthetic content produced or published by the organisation. Generated audio, image, video and text is marked in a machine-readable format so that it can be detected as artificially generated or manipulated, and deep fake content is disclosed as such where it is published.\n\nMarking is not permission. A real person's voice or likeness may not be generated without a documented right to use it, an existing work may not be imitated without clearance, and a generated endorsement may not imply that a person or organisation has endorsed anything they have not.\n\nWhere a system interacts directly with a person, the person is told they are dealing with an AI system unless that is obvious from the context. Records of what was generated, from which prompt and by whom, are retained for the period set in the records schedule.",
    "Esta política regula el contenido sintético que la organización produce o publica. El audio, las imágenes, el vídeo y el texto generados se marcan en un formato legible por máquina para que pueda detectarse que se han generado o manipulado artificialmente, y el contenido ultrasuplantado se indica como tal cuando se publica.\n\nEl marcado no es una autorización. No puede generarse la voz o la imagen de una persona real sin un derecho documentado a utilizarlas, no puede imitarse una obra existente sin la autorización correspondiente, y un aval generado no puede dar a entender que una persona u organización ha respaldado algo que no ha respaldado.\n\nCuando un sistema interactúe directamente con una persona, se le informa de que está tratando con un sistema de IA, salvo que resulte evidente por el contexto. Los registros de lo generado, a partir de qué instrucción y por quién, se conservan durante el plazo fijado en el calendario de conservación.",
  ],
  [
    "Public Sector",
    "Sector público",
  ],
  [
    "AI systems in government and public bodies: citizen services, benefits triage, case handling and emergency dispatch.",
    "Sistemas de IA en la Administración y en organismos públicos: atención a la ciudadanía, triaje de prestaciones, tramitación de expedientes y despacho de emergencias.",
  ],
  [
    "Citizen Service Assistant",
    "Asistente de atención a la ciudadanía",
  ],
  [
    "Conversational assistant that answers questions about public services, forms and entitlements.",
    "Asistente conversacional que responde a preguntas sobre servicios públicos, formularios y prestaciones.",
  ],
  [
    "Answer routine questions about public services so that staff time goes to the cases that need a person",
    "Responder a las preguntas habituales sobre servicios públicos para que el tiempo del personal se dedique a los casos que necesitan a una persona",
  ],
  [
    "A system that interacts directly with people must tell them they are dealing with an AI system (Art. 50(1)). It must not give an answer that determines an entitlement; where a question turns on eligibility it hands over to a caseworker, and the handover point is recorded.",
    "Un sistema que interactúa directamente con personas debe informarles de que están tratando con un sistema de IA (art. 50, apartado 1). No debe dar una respuesta que determine una prestación; cuando una pregunta dependa de la elegibilidad, deriva a una persona instructora y se registra el punto de derivación.",
  ],
  [
    "Benefits Eligibility Triage",
    "Triaje de elegibilidad de prestaciones",
  ],
  [
    "Model that scores and orders applications for public assistance so that cases are routed and prioritised.",
    "Modelo que puntúa y ordena las solicitudes de prestaciones públicas para encaminar y priorizar los expedientes.",
  ],
  [
    "Route and prioritise applications for public assistance benefits and services",
    "Encaminar y priorizar las solicitudes de prestaciones y servicios de asistencia pública",
  ],
  [
    "Annex III point 5(a): AI intended to evaluate eligibility for essential public assistance benefits and services, or to grant, reduce, revoke or reclaim them. A public body deploying it must also complete a fundamental rights impact assessment under Art. 27 and register the use.",
    "Anexo III, punto 5, letra a): IA destinada a evaluar la admisibilidad a prestaciones y servicios esenciales de asistencia pública, o a concederlos, reducirlos, revocarlos o recuperarlos. Un organismo público que la despliegue debe además realizar una evaluación de impacto sobre los derechos fundamentales conforme al art. 27 y registrar el uso.",
  ],
  [
    "Case Document Processing",
    "Tramitación documental de expedientes",
  ],
  [
    "System that classifies incoming correspondence, extracts fields and files documents against the right case.",
    "Sistema que clasifica la correspondencia entrante, extrae campos y archiva los documentos en el expediente que corresponde.",
  ],
  [
    "Classify and file incoming correspondence so that cases are complete and findable",
    "Clasificar y archivar la correspondencia entrante para que los expedientes estén completos y sean localizables",
  ],
  [
    "Administrative processing that does not decide anything about a person. The risks are ordinary ones: misfiling, retention beyond the schedule, and access by staff who should not see the file. Records duties and freedom of information obligations continue to apply to whatever it produces.",
    "Tramitación administrativa que no decide nada sobre una persona. Los riesgos son los ordinarios: archivar mal, conservar más allá del calendario y que acceda personal que no debería ver el expediente. Los deberes de archivo y las obligaciones de acceso a la información pública siguen aplicándose a lo que produzca.",
  ],
  [
    "Emergency Call Triage",
    "Triaje de llamadas de emergencia",
  ],
  [
    "System that classifies emergency calls by urgency and type to support dispatch decisions.",
    "Sistema que clasifica las llamadas de emergencia por urgencia y tipo para apoyar las decisiones de despacho.",
  ],
  [
    "Establish priority and dispatch category for emergency calls",
    "Establecer la prioridad y la categoría de despacho de las llamadas de emergencia",
  ],
  [
    "Annex III point 5(d): AI intended to evaluate and classify emergency calls or to establish priority in the dispatching of emergency first response services. Human oversight must be capable of overriding the classification in the moment, not after review.",
    "Anexo III, punto 5, letra d): IA destinada a evaluar y clasificar llamadas de emergencia o a establecer prioridades en el envío de servicios de primera intervención. La supervisión humana debe poder anular la clasificación en el momento, no en una revisión posterior.",
  ],
  [
    "AI Usage Policy - Public Sector",
    "Política de uso de la IA: sector público",
  ],
  [
    "How public servants may use AI in administrative work",
    "Cómo puede el personal público utilizar la IA en la tramitación administrativa",
  ],
  [
    "This policy governs AI use in administrative work. Every system is registered before use, with its purpose, its legal basis and the official responsible for it recorded. A system that contributes to a decision about a person is registered as such even where a person signs the decision.\n\nAI output is never the decision. The official taking the decision is accountable for it, must be able to explain it without referring to the system's internal workings, and must be able to depart from the system's output without seeking permission.\n\nPublic bodies hold records for longer and disclose them more often than private organisations. Anything a system generates is a record: it is retained on the applicable schedule and is disclosable on request unless an exemption applies.",
    "Esta política regula el uso de la IA en la tramitación administrativa. Cada sistema se registra antes de su uso, dejando constancia de su finalidad, su base jurídica y el cargo responsable. Un sistema que contribuya a una decisión sobre una persona se registra como tal aunque sea una persona quien firme la decisión.\n\nEl resultado de la IA nunca es la decisión. Quien decide responde de ella, debe poder explicarla sin referirse al funcionamiento interno del sistema y debe poder apartarse del resultado del sistema sin pedir autorización.\n\nLos organismos públicos conservan documentación durante más tiempo y la divulgan con más frecuencia que las organizaciones privadas. Todo lo que genere un sistema es documentación: se conserva según el calendario aplicable y es divulgable a petición, salvo que se aplique una excepción.",
  ],
  [
    "Automated Decisions and Explanation Policy",
    "Política de decisiones automatizadas y explicación",
  ],
  [
    "Human oversight, explanation and appeal for decisions supported by AI",
    "Supervisión humana, explicación y recurso en las decisiones apoyadas en IA",
  ],
  [
    "This policy governs decisions about individuals that are taken with the support of an AI system. Before deployment, the body completes a fundamental rights impact assessment and records the categories of people affected, the risks identified and the measures taken.\n\nEvery person subject to such a decision is told that a system was involved, in plain language, and is given the main elements of the decision. An appeal goes to a person who was not involved in the original decision and who has the authority and the information to change it.\n\nThe officials who oversee the system receive training for that role, including its known limitations and error patterns. Where the system's output is overridden repeatedly in the same direction, the pattern is investigated rather than accepted as normal.",
    "Esta política regula las decisiones sobre personas que se adoptan con el apoyo de un sistema de IA. Antes del despliegue, el organismo realiza una evaluación de impacto sobre los derechos fundamentales y deja constancia de las categorías de personas afectadas, de los riesgos detectados y de las medidas adoptadas.\n\nA toda persona sujeta a una decisión de este tipo se le informa, en lenguaje claro, de que ha intervenido un sistema, y se le facilitan los principales elementos de la decisión. El recurso se resuelve por una persona que no participó en la decisión inicial y que tiene la autoridad y la información necesarias para modificarla.\n\nEl personal que supervisa el sistema recibe formación para esa función, incluidas sus limitaciones conocidas y sus patrones de error. Cuando el resultado del sistema se anule repetidamente en el mismo sentido, el patrón se investiga en lugar de aceptarse como normal.",
  ],
  [
    "AI Procurement Policy - Public Sector",
    "Política de contratación de IA: sector público",
  ],
  [
    "Buying AI systems with the duties that follow them",
    "Comprar sistemas de IA con los deberes que llevan aparejados",
  ],
  [
    "This policy governs the procurement of AI systems and of services that embed them. Tender documents state the intended purpose, the risk classification the body has reached, and the obligations that follow from it, so suppliers price the duties rather than discovering them later.\n\nContracts require the supplier to provide the instructions for use, the technical documentation the body needs to meet its own duties, notice of substantial modifications, and cooperation with any authority that asks. The body obtains the right to test the system, including for discriminatory outcomes, before and during deployment.\n\nA supplier's certification is evidence, not a conclusion. The body records its own assessment of the system against its intended use, and retains the evidence for the period the records schedule requires.",
    "Esta política regula la contratación de sistemas de IA y de servicios que los incorporan. Los pliegos indican la finalidad prevista, la clasificación de riesgo a la que ha llegado el organismo y las obligaciones que de ella se derivan, de modo que los licitadores valoren esos deberes en lugar de descubrirlos después.\n\nLos contratos exigen al proveedor facilitar las instrucciones de uso, la documentación técnica que el organismo necesita para cumplir sus propios deberes, el aviso de las modificaciones sustanciales y la cooperación con cualquier autoridad que lo solicite. El organismo obtiene el derecho a probar el sistema, también en cuanto a resultados discriminatorios, antes del despliegue y durante este.\n\nLa certificación de un proveedor es una prueba, no una conclusión. El organismo deja constancia de su propia evaluación del sistema frente al uso previsto y conserva la evidencia durante el plazo que exija el calendario de conservación.",
  ],
];

// ============================================================
// DICTIONARY
// ============================================================

function buildDictionary(pairs: readonly Pair[]): Record<string, string> {
  const dict: Record<string, string> = {};
  for (const [en, es] of pairs) {
    if (Object.prototype.hasOwnProperty.call(dict, en) && dict[en] !== es) {
      throw new Error(`ai-governance-templates.es: conflicting translations for "${en.slice(0, 60)}"`);
    }
    dict[en] = es;
  }
  return dict;
}

/** English source string (byte for byte) → Castilian Spanish translation. */
export const AI_GOVERNANCE_TEMPLATES_ES: Record<string, string> = buildDictionary(PAIRS);

// ============================================================
// HELPERS
// ============================================================

/**
 * Return the Spanish translation when `locale` is "es" and one exists;
 * otherwise return the English unchanged.
 */
export function localizeTemplateString(en: string, locale: TemplateLocale): string {
  if (locale !== "es") return en;
  return Object.prototype.hasOwnProperty.call(AI_GOVERNANCE_TEMPLATES_ES, en)
    ? AI_GOVERNANCE_TEMPLATES_ES[en]
    : en;
}

/**
 * Return a deep copy of `template` with every user-visible string localized:
 * template name/description; systems' name/description/purpose/riskRationale;
 * policies' title/description/content. Every other field (id, icon, technique,
 * role, riskLevel, gateType, annexIIICategory, policy type, flags) is copied
 * unchanged.
 */
export function localizeTemplate<T extends AIGovernanceTemplate>(template: T, locale: TemplateLocale): T {
  const l = (s: string) => localizeTemplateString(s, locale);
  return {
    ...template,
    name: l(template.name),
    description: l(template.description),
    systems: template.systems.map((system) => ({
      ...system,
      name: l(system.name),
      description: l(system.description),
      purpose: l(system.purpose),
      riskRationale: l(system.riskRationale),
    })),
    policies: template.policies.map((policy) => ({
      ...policy,
      title: l(policy.title),
      description: l(policy.description),
      content: l(policy.content),
    })),
  };
}
