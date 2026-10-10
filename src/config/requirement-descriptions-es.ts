// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Spanish display text for the requirement descriptions of the EU AI Act,
 * NIST AI RMF and ISO/IEC 42001, keyed by requirement code, as
 * scripts/seed-frameworks.ts and src/config/eu-timeline-requirements.ts seed
 * them. Read through requirementDescription() in ./framework-display.ts, the
 * same lookup the titles use; the stored English text is unchanged.
 *
 * Wording: the EU AI Act rows follow the terms of the Spanish version of
 * Regulation (EU) 2024/1689 (proveedor, responsable del despliegue, sistema
 * de IA de alto riesgo, modelo de IA de uso general, autoridad de vigilancia
 * del mercado, ultrasuplantación). NIST and ISO rows translate the meaning;
 * the identifiers stay as published. The ISO rows use the vocabulary of the
 * Spanish edition of the ISO management-system standards (alta dirección,
 * partes interesadas, información documentada, SGIA).
 *
 * A test checks that every seeded code has a Spanish description here.
 *
 * Pure module: no Prisma, no React, no Next.
 */

export const EU_AI_ACT_DESCRIPTIONS_ES: Readonly<Record<string, string>> = {
  "Art. 1":
    "Finalidad del Reglamento: mejorar el funcionamiento del mercado interior mediante normas armonizadas sobre los sistemas de IA.",
  "Art. 2":
    "Se aplica a los proveedores, responsables del despliegue, importadores y distribuidores de sistemas de IA en la Unión, entre otros operadores.",
  "Art. 3":
    "Definiciones clave, como sistema de IA, proveedor, responsable del despliegue o sistema de IA de alto riesgo.",
  "Art. 4":
    "Los proveedores y responsables del despliegue de sistemas de IA adoptarán medidas para favorecer la alfabetización en materia de IA de su personal y de las demás personas que se encarguen en su nombre del funcionamiento y la utilización de esos sistemas, teniendo en cuenta sus conocimientos técnicos, su experiencia, su educación y formación y el contexto de uso. No es necesario garantizar un nivel concreto de alfabetización de ninguna persona. Se aplica desde el 2 de febrero de 2025, en la redacción dada por el Reglamento (UE) 2026/1744.",
  "Art. 5": "Prácticas de IA prohibidas por presentar un riesgo inaceptable.",
  "Art. 5(1)(a)":
    "Sistemas de IA que se sirven de técnicas subliminales que trascienden la conciencia de una persona, o de técnicas deliberadamente manipuladoras o engañosas, para alterar de manera sustancial su comportamiento.",
  "Art. 5(1)(b)":
    "Sistemas de IA que explotan las vulnerabilidades de las personas derivadas de su edad, de una discapacidad o de una situación social o económica específica.",
  "Art. 5(1)(c)":
    "Sistemas de IA que evalúan o clasifican a personas físicas según su comportamiento social o sus características personales, con un resultado que provoca un trato perjudicial o desfavorable.",
  "Art. 5(1)(d)":
    "Sistemas de IA que evalúan el riesgo de que una persona física cometa un delito, o lo predicen, basándose únicamente en la elaboración de su perfil o en la evaluación de sus rasgos y características de personalidad.",
  "Art. 5(1)(e)":
    "Sistemas de IA que crean o amplían bases de datos de reconocimiento facial mediante la extracción no selectiva de imágenes faciales de internet o de circuitos cerrados de televisión.",
  "Art. 5(1)(f)":
    "Sistemas de IA para inferir las emociones de una persona física en el lugar de trabajo y en los centros educativos, salvo por motivos médicos o de seguridad.",
  "Art. 5(1)(g)":
    "Sistemas de categorización biométrica que clasifican a las personas físicas a partir de sus datos biométricos para deducir o inferir su raza, opiniones políticas, afiliación sindical, convicciones religiosas o filosóficas, vida sexual u orientación sexual.",
  "Art. 5(1)(h)":
    "Uso de sistemas de identificación biométrica remota «en tiempo real» en espacios de acceso público con fines de garantía del cumplimiento del Derecho, salvo excepciones tasadas.",
  "Art. 6":
    "Reglas para determinar qué sistemas de IA son de alto riesgo, incluida la lista del anexo III.",
  "Art. 6(1)":
    "Sistemas de IA que son componentes de seguridad de productos, o que son en sí mismos productos, regulados por la legislación de armonización de la Unión.",
  "Art. 6(2)":
    "Sistemas de IA de los ámbitos del anexo III (biometría, infraestructuras críticas, educación, empleo, servicios esenciales, garantía del cumplimiento del Derecho, migración y administración de justicia).",
  "Art. 8":
    "Los sistemas de IA de alto riesgo cumplirán los requisitos de la sección 2 del capítulo III.",
  "Art. 9":
    "Establecer, implantar, documentar y mantener un sistema de gestión de riesgos durante todo el ciclo de vida del sistema de IA.",
  "Art. 9(2)": "Determinación y análisis de los riesgos conocidos y razonablemente previsibles.",
  "Art. 9(3)": "Evaluación de los riesgos derivados de un uso indebido razonablemente previsible.",
  "Art. 9(4)": "Adopción de medidas de gestión de riesgos adecuadas y específicas.",
  "Art. 9(5)":
    "Pruebas para comprobar que el sistema de IA funciona de manera coherente y que los niveles de riesgo son adecuados.",
  "Art. 10":
    "Los conjuntos de datos de entrenamiento, validación y prueba se someterán a prácticas adecuadas de gobernanza y gestión de datos.",
  "Art. 10(2)":
    "Decisiones de diseño pertinentes, procesos de recogida de datos, preparación de los datos y formulación de supuestos.",
  "Art. 10(3)":
    "Los conjuntos de datos de entrenamiento, validación y prueba serán pertinentes, suficientemente representativos y, en la mayor medida posible, carecerán de errores.",
  "Art. 10(4)":
    "Los conjuntos de datos tendrán en cuenta las características propias del entorno geográfico, contextual, conductual o funcional en el que se usará el sistema.",
  "Art. 10(5)":
    "Tratamiento de categorías especiales de datos personales para detectar y corregir sesgos, con sujeción a garantías adecuadas.",
  "Art. 11":
    "La documentación técnica se elaborará antes de la introducción del sistema en el mercado y se mantendrá actualizada.",
  "Art. 11(1)":
    "Elaborar la documentación técnica antes de la introducción del sistema en el mercado o de su puesta en servicio.",
  "Art. 12":
    "Los sistemas de IA de alto riesgo permitirán el registro automático de acontecimientos (archivos de registro) durante todo su ciclo de vida.",
  "Art. 12(1)":
    "Los sistemas de IA de alto riesgo permitirán técnicamente el registro automático de acontecimientos.",
  "Art. 12(2)":
    "El registro garantizará la trazabilidad del funcionamiento del sistema de IA durante todo su ciclo de vida.",
  "Art. 13":
    "Los sistemas de IA de alto riesgo se diseñarán y desarrollarán de modo que su funcionamiento sea suficientemente transparente.",
  "Art. 13(1)":
    "Diseño y desarrollo que garanticen un funcionamiento suficientemente transparente para que los responsables del despliegue interpreten los resultados de salida y los usen adecuadamente.",
  "Art. 13(2)":
    "Los sistemas irán acompañados de instrucciones de uso, en un formato digital adecuado, con información concisa, completa, correcta y clara.",
  "Art. 14":
    "Los sistemas de IA de alto riesgo se diseñarán de modo que personas físicas puedan supervisarlos de manera efectiva mientras estén en uso.",
  "Art. 14(1)":
    "Diseño y desarrollo que permitan a personas físicas supervisar el sistema de manera efectiva durante el período de uso.",
  "Art. 14(2)":
    "El proveedor determinará las medidas de supervisión y las integrará en el sistema, o determinará las que deba aplicar el responsable del despliegue.",
  "Art. 14(3)":
    "Las personas encargadas de la supervisión deben poder comprender adecuadamente las capacidades y limitaciones pertinentes del sistema.",
  "Art. 14(4)":
    "Capacidad de decidir no usar el sistema de IA de alto riesgo, o de invalidar o revertir sus resultados de salida.",
  "Art. 15":
    "Los sistemas de IA de alto riesgo se diseñarán y desarrollarán de modo que alcancen un nivel adecuado de precisión, solidez y ciberseguridad.",
  "Art. 15(1)": "Alcanzar un nivel de precisión adecuado a su finalidad prevista.",
  "Art. 15(2)":
    "Los niveles de precisión y los parámetros de precisión pertinentes se indicarán en las instrucciones de uso.",
  "Art. 15(3)":
    "Diseño resistente a los errores, fallos o incoherencias que puedan surgir en el propio sistema o en su entorno.",
  "Art. 15(4)":
    "Solidez lograda mediante soluciones adecuadas de redundancia técnica, como copias de seguridad o planes de prevención de fallos; los sistemas que siguen aprendiendo deben abordar el riesgo de bucles de retroalimentación sesgados.",
  "Art. 15(5)":
    "Resistencia frente a los intentos de terceros no autorizados de alterar el uso, los resultados de salida o el funcionamiento del sistema, con medidas contra el envenenamiento de datos y de modelos, los ejemplos adversarios y los ataques a la confidencialidad.",
  "Art. 16":
    "Los proveedores garantizarán el cumplimiento de los requisitos, establecerán un sistema de gestión de la calidad y conservarán la documentación.",
  "Art. 17":
    "Los proveedores implantarán un sistema de gestión de la calidad que garantice el cumplimiento. La norma EN 18286:2026, primera norma armonizada candidata para este artículo, se publicó en julio de 2026, pero aún no se ha citado en el Diario Oficial, por lo que todavía no ofrece presunción de conformidad conforme al art. 40.",
  "Art. 26":
    "Los responsables del despliegue usarán los sistemas con arreglo a las instrucciones de uso, garantizarán la supervisión humana y vigilarán su funcionamiento.",
  "Art. 26(1)":
    "Adoptar medidas técnicas y organizativas adecuadas para garantizar que el sistema se use con arreglo a sus instrucciones de uso.",
  "Art. 26(2)":
    "Encomendar la supervisión humana a personas físicas con la competencia, la formación y la autoridad necesarias.",
  "Art. 26(5)":
    "Los responsables del despliegue vigilarán el funcionamiento del sistema de IA de alto riesgo según las instrucciones de uso y, cuando proceda, informarán al proveedor (art. 72); también informarán al proveedor o al distribuidor y a la autoridad de vigilancia del mercado de los riesgos (art. 79.1) y de los incidentes graves.",
  "Art. 27":
    "Los responsables del despliegue de sistemas de IA de alto riesgo realizarán una evaluación de impacto relativa a los derechos fundamentales antes de usarlos.",
  "Art. 27(1)":
    "Realizar la evaluación de impacto relativa a los derechos fundamentales antes de empezar a usar el sistema de IA de alto riesgo.",
  "Art. 27(2)":
    "Descripción de los procesos del responsable del despliegue, el período de uso, las categorías de personas afectadas, los riesgos específicos, la supervisión humana y las medidas de reparación.",
  "Art. 27(3)":
    "Notificar los resultados de la evaluación a la autoridad de vigilancia del mercado competente.",
  "Art. 49":
    "Antes de introducir en el mercado o poner en servicio un sistema de IA de alto riesgo del anexo III, el proveedor (o su representante autorizado) se registrará, y registrará el sistema, en la base de datos de la UE a que se refiere el art. 71. Los responsables del despliegue que sean autoridades públicas u órganos de la Unión registrarán también su uso.",
  "Art. 50":
    "Los proveedores y responsables del despliegue de determinados sistemas de IA garantizarán la transparencia. Se aplica desde el 2 de agosto de 2026. La Comisión adoptó las directrices definitivas sobre las obligaciones de transparencia el 20 de julio de 2026, y en julio de 2026 se consideró adecuado el Código de buenas prácticas sobre la transparencia del contenido generado por IA para el art. 50, apartados 2, 4 y 5.",
  "Art. 50(1)":
    "Los proveedores garantizarán que los sistemas de IA destinados a interactuar con personas se diseñen de modo que estas sepan que están interactuando con una IA.",
  "Art. 50(2)":
    "Los proveedores de sistemas de IA que generan contenido sintético de audio, imagen, vídeo o texto garantizarán que los resultados de salida estén marcados en un formato legible por máquina.",
  "Art. 50(3)":
    "Los responsables del despliegue de sistemas de reconocimiento de emociones o de categorización biométrica informarán de su funcionamiento a las personas expuestas a ellos.",
  "Art. 50(4)":
    "Los responsables del despliegue de sistemas de IA que generan ultrasuplantaciones harán público que el contenido se ha generado o manipulado de manera artificial.",
  "Art. 53":
    "Los proveedores de modelos de IA de uso general cumplirán obligaciones de documentación y transparencia.",
  "Art. 53(1)(a)": "Elaborar y mantener actualizada la documentación técnica del modelo.",
  "Art. 53(1)(b)":
    "Poner información y documentación a disposición de los proveedores de sistemas de IA que tengan intención de integrar el modelo.",
  "Art. 53(1)(c)":
    "Establecer directrices para cumplir el Derecho de la Unión en materia de derechos de autor.",
  "Art. 53(1)(d)":
    "Elaborar y poner a disposición del público un resumen suficientemente detallado del contenido usado para el entrenamiento.",
  "Art. 72":
    "Los proveedores establecerán y documentarán un sistema de vigilancia poscomercialización proporcionado a la naturaleza de las tecnologías de IA y a los riesgos del sistema de IA de alto riesgo.",
  "Art. 73":
    "Los proveedores de sistemas de IA de alto riesgo introducidos en el mercado de la Unión notificarán cualquier incidente grave a las autoridades de vigilancia del mercado.",
  "Art. 73(1)":
    "Notificar cualquier incidente grave a las autoridades de vigilancia del mercado de los Estados miembros en los que se haya producido.",
  "Art. 73(2)-(4)":
    "Notificar inmediatamente después de establecer un vínculo causal (o la probabilidad razonable de que exista) y, como máximo, en los quince días siguientes a tener conocimiento del incidente; en los dos días siguientes en caso de infracción generalizada o de incidente grave que perturbe infraestructuras críticas, y en los diez días siguientes en caso de fallecimiento.",
  "Art. 86":
    "Toda persona afectada por una decisión que el responsable del despliegue adopte basándose en los resultados de salida de un sistema de IA de alto riesgo del anexo III (salvo el punto 2), y que produzca efectos jurídicos o le afecte de un modo igualmente significativo que considere perjudicial para su salud, su seguridad o sus derechos fundamentales, tiene derecho a obtener del responsable del despliegue explicaciones claras y significativas sobre el papel del sistema de IA en el proceso de toma de decisiones y sobre los principales elementos de la decisión adoptada.",
  "Art. 99":
    "Los Estados miembros establecerán el régimen de sanciones aplicable a las infracciones.",
  "Art. 99(3)":
    "Incumplimiento de las prácticas prohibidas: hasta 35 millones de euros o el 7 % del volumen de negocios mundial total anual.",
  "Art. 99(4)":
    "Incumplimiento de los requisitos de alto riesgo: hasta 15 millones de euros o el 3 % del volumen de negocios mundial total anual.",
  "Art. 99(5)":
    "Suministro de información incorrecta: hasta 7,5 millones de euros o el 1 % del volumen de negocios mundial total anual.",

  // The application timeline (src/config/eu-timeline-requirements.ts).
  "Art. 113":
    "El Reglamento de IA entró en vigor el 1 de agosto de 2024 y se aplica de forma escalonada (véanse las entradas siguientes), con las modificaciones del Ómnibus Digital sobre IA, el Reglamento (UE) 2026/1744, de 8 de julio de 2026 (DO L, 2026/1744, 24.7.2026), en vigor desde el 27 de julio de 2026. Otras fechas que fija esa modificación: los artículos 102 a 110 se aplican desde el 27 de julio de 2026 (art. 113, párrafo tercero, letra d); cada Estado miembro tendrá operativo su espacio controlado de pruebas para la IA a más tardar el 2 de agosto de 2027 (art. 57.1), y los sistemas de alto riesgo destinados a ser usados por autoridades públicas deberán cumplir a más tardar el 2 de agosto de 2030 (art. 111.2).",
  "Art. 113(a) — 2 Feb 2025":
    "Los capítulos I y II se aplican desde el 2 de febrero de 2025 (art. 113, párrafo tercero, letra a): disposiciones generales, alfabetización en materia de IA (art. 4, en la redacción dada por el Reglamento (UE) 2026/1744) y prácticas de IA prohibidas (art. 5). Se exceptúan el art. 5, apartado 1, párrafo primero, letras b bis) y b ter), y el art. 5, apartados 1 bis y 1 ter, que se aplican desde el 2 de diciembre de 2026.",
  "Art. 113(b) — 2 Aug 2025":
    "Desde el 2 de agosto de 2025 (art. 113, párrafo tercero, letra b): normas sobre los organismos notificados (capítulo III, sección 4), obligaciones de los modelos de IA de uso general (capítulo V), gobernanza (capítulo VII), sanciones (capítulo XII, salvo el art. 101) y confidencialidad (art. 78).",
  "Art. 113 — 2 Aug 2026":
    "Desde el 2 de agosto de 2026, fecha general de aplicación (art. 113, párrafo segundo): se aplican las obligaciones de transparencia del art. 50 (aviso en los asistentes conversacionales, marcado del contenido sintético y etiquetado de las ultrasuplantaciones) y empiezan las competencias de ejecución de la Comisión sobre los modelos de IA de uso general (arts. 91 a 93 y multas del art. 101). Los proveedores de sistemas de IA generativa introducidos en el mercado antes del 2 de agosto de 2026 deben cumplir el art. 50.2 a más tardar el 2 de diciembre de 2026 (art. 111.4, introducido por el Reglamento (UE) 2026/1744). Las obligaciones de alto riesgo del anexo III NO se aplican en esta fecha (las aplazó el Ómnibus Digital; véase la entrada del 2 de diciembre de 2027).",
  "Art. 5 — 2 Dec 2026":
    "Desde el 2 de diciembre de 2026 (art. 113, párrafo tercero, letra a, en la redacción dada por el Reglamento (UE) 2026/1744): las nuevas prohibiciones del art. 5, apartado 1, párrafo primero, letras b bis) y b ter), sobre los sistemas de IA destinados a generar imágenes íntimas no consentidas y material de abuso sexual infantil, junto con el art. 5, apartados 1 bis y 1 ter. Afectan a los proveedores cuando esa generación sea la finalidad del sistema o resulte razonablemente previsible a falta de salvaguardas, y a los responsables del despliegue en caso de uso indebido deliberado.",
  "Art. 113 — 2 Dec 2027":
    "Desde el 2 de diciembre de 2027 (art. 113, párrafo tercero, letra c, en la redacción dada por el Reglamento (UE) 2026/1744; aplazado desde el 2 de agosto de 2026): el capítulo III, secciones 1, 2 y 3, salvo el art. 6.5, se aplica a los sistemas de alto riesgo del art. 6.2 y del anexo III. Esas secciones regulan la clasificación (arts. 6 y 7), los requisitos de los sistemas de alto riesgo (arts. 8 a 15) y las obligaciones de los proveedores, los responsables del despliegue y otras partes (arts. 16 a 27, incluida la evaluación de impacto relativa a los derechos fundamentales del art. 27). Los sistemas de alto riesgo destinados a ser usados por autoridades públicas tienen de plazo hasta el 2 de agosto de 2030 (art. 111.2).",
  "Art. 113(c) — 2 Aug 2028":
    "Desde el 2 de agosto de 2028 (art. 113, párrafo tercero, letra c, en la redacción dada por el Reglamento (UE) 2026/1744; aplazado desde el 2 de agosto de 2027): el capítulo III, secciones 1, 2 y 3, salvo el art. 6.5, se aplica a los sistemas de alto riesgo del art. 6.1 y del anexo I, es decir, a la IA que es componente de seguridad de un producto regulado por la legislación de armonización de la Unión del anexo I, o que es en sí misma ese producto (por ejemplo, los productos sanitarios regulados por el Reglamento (UE) 2017/745).",
};

export const NIST_AI_RMF_DESCRIPTIONS_ES: Readonly<Record<string, string>> = {
  GOVERN:
    "Fomentar e implantar una cultura de gestión de riesgos en las organizaciones que diseñan, desarrollan, despliegan o usan sistemas de IA.",
  "GOVERN 1":
    "Hay políticas, procesos, procedimientos y prácticas implantados y en uso para mapear, medir y gestionar los riesgos de la IA.",
  "GOVERN 2":
    "Existen estructuras de rendición de cuentas para que los equipos y las personas adecuados tengan atribuciones, responsabilidad y formación.",
  "GOVERN 3":
    "Se da prioridad a los procesos de diversidad, equidad, inclusión y accesibilidad de la plantilla al mapear, medir y gestionar los riesgos de la IA.",
  "GOVERN 4":
    "Los equipos de la organización se comprometen con una cultura que tiene en cuenta y comunica los riesgos de la IA.",
  "GOVERN 5":
    "Hay procesos para colaborar de forma sólida con los actores de IA pertinentes.",
  "GOVERN 6":
    "Existen políticas y procedimientos para abordar los riesgos y beneficios de la IA derivados de software y datos de terceros.",
  MAP: "Establecer el contexto que enmarca los riesgos de un sistema de IA.",
  "MAP 1":
    "Se establece y se comprende el contexto: finalidades previstas, usos potencialmente beneficiosos, y leyes y normas propias del contexto.",
  "MAP 2":
    "Se categoriza el sistema de IA, incluidos su tarea, sus métodos y los límites de su conocimiento.",
  "MAP 3":
    "Se comprenden las capacidades de la IA, su uso previsto, sus objetivos y sus beneficios y costes esperados, comparados con referencias adecuadas.",
  "MAP 4":
    "Se mapean los riesgos y beneficios de todos los componentes del sistema de IA, incluidos el software y los datos de terceros.",
  "MAP 5":
    "Probabilidad y magnitud de cada impacto detectado, a partir del uso previsto, los usos anteriores y el uso indebido o el abuso previsibles.",
  MEASURE:
    "Usar herramientas, técnicas y metodologías cuantitativas, cualitativas o mixtas para analizar, evaluar, comparar y vigilar los riesgos de la IA.",
  "MEASURE 1": "Se determinan y aplican métodos y métricas adecuados.",
  "MEASURE 2": "Se evalúan los sistemas de IA con respecto a las características de una IA fiable.",
  "MEASURE 3": "Existen mecanismos para seguir a lo largo del tiempo los riesgos de la IA detectados.",
  "MEASURE 4":
    "Se recogen comentarios sobre la eficacia de la medición y se incorporan a las actualizaciones del sistema de IA.",
  MANAGE: "Asignar periódicamente recursos a los riesgos ya mapeados y medidos.",
  "MANAGE 1":
    "Los riesgos de la IA se priorizan, se abordan y se gestionan a partir de las evaluaciones y de otros resultados analíticos.",
  "MANAGE 2":
    "Se planifican, preparan, aplican, documentan y vigilan estrategias para maximizar los beneficios de la IA y minimizar sus efectos negativos.",
  "MANAGE 3":
    "Se vigilan periódicamente los riesgos y beneficios de la IA procedentes de recursos de terceros, y se aplican controles de riesgo.",
  "MANAGE 4":
    "Se documentan y vigilan periódicamente los tratamientos del riesgo, incluidos los planes de respuesta, recuperación y comunicación.",
};

export const ISO_42001_DESCRIPTIONS_ES: Readonly<Record<string, string>> = {
  "4": "Comprensión de la organización, de las necesidades y expectativas de las partes interesadas, del alcance y del SGIA.",
  "4.1":
    "Determinar las cuestiones externas e internas pertinentes para el propósito y la dirección estratégica del sistema de gestión de la IA.",
  "4.2": "Determinar las partes interesadas pertinentes para el SGIA y sus requisitos.",
  "4.3": "Determinar los límites y la aplicabilidad del sistema de gestión de la IA.",
  "4.4": "Establecer, implementar, mantener y mejorar continuamente un sistema de gestión de la IA.",
  "5": "Compromiso de la alta dirección, política de IA y roles en la organización.",
  "5.1": "La alta dirección debe demostrar liderazgo y compromiso con respecto al SGIA.",
  "5.2": "Establecer una política de IA adecuada al propósito de la organización.",
  "5.3": "Asegurarse de que las responsabilidades y autoridades de los roles pertinentes se asignan y se comunican.",
  "6": "Acciones para abordar riesgos y oportunidades, objetivos de la IA y planificación de los cambios.",
  "6.1": "Determinar los riesgos y oportunidades que es necesario abordar en el SGIA.",
  "6.1.2": "Definir y aplicar un proceso de evaluación de riesgos de la IA que tenga en cuenta los riesgos propios de la IA.",
  "6.1.3": "Definir y aplicar un proceso de tratamiento de riesgos de la IA.",
  "6.1.4": "Evaluar los posibles impactos de los sistemas de IA sobre las personas, los grupos y la sociedad.",
  "6.2": "Establecer objetivos de la IA en las funciones, niveles y procesos pertinentes.",
  "7": "Recursos, competencia, toma de conciencia, comunicación e información documentada.",
  "7.1": "Determinar y proporcionar los recursos necesarios para el SGIA.",
  "7.2": "Determinar la competencia necesaria de las personas cuyo trabajo afecta al desempeño de la IA.",
  "7.3": "Las personas que trabajan bajo el control de la organización deben ser conscientes de la política de IA y de su contribución al SGIA.",
  "7.4": "Determinar las comunicaciones internas y externas pertinentes para el SGIA.",
  "7.5": "El SGIA debe incluir la información documentada que exige la norma.",
  "8": "Planificación y control operacional, evaluación de riesgos de la IA y tratamiento de riesgos de la IA.",
  "8.1": "Planificar, implementar y controlar los procesos necesarios para cumplir los requisitos.",
  "8.2": "Realizar evaluaciones de riesgos de la IA a intervalos planificados o cuando se propongan cambios significativos.",
  "8.3": "Implementar el plan de tratamiento de riesgos de la IA.",
  "8.4": "Realizar evaluaciones de impacto de los sistemas de IA.",
  "9": "Seguimiento, medición, análisis, evaluación, auditoría interna y revisión por la dirección.",
  "9.1": "Determinar qué es necesario seguir y medir en los sistemas de IA.",
  "9.2": "Realizar auditorías internas a intervalos planificados para obtener información sobre el SGIA.",
  "9.3": "La alta dirección debe revisar el SGIA de la organización a intervalos planificados.",
  "10": "No conformidad, acción correctiva y mejora continua.",
  "10.1": "Mejorar continuamente la idoneidad, la adecuación y la eficacia del SGIA.",
  "10.2":
    "Cuando se produzca una no conformidad, reaccionar ante ella, evaluarla, aplicar acciones correctivas y revisar su eficacia.",
};
