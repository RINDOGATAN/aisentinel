// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One policy as a Word document (.docx, built with the docx package), so the
 * organization can keep editing it in its own tools. Same content and order as
 * the PDF: organization name, title, the reference table, the text, the linked
 * systems and the generation stamp. The organization's name also heads every
 * page.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { PolicyBlock, PolicyDocument } from "./policy-document";

const NUMBERING_REF = "policy-numbered";

function blockParagraph(block: PolicyBlock): Paragraph {
  switch (block.kind) {
    case "heading":
      return new Paragraph({
        text: block.text,
        heading:
          block.level === 1 ? HeadingLevel.HEADING_2 : block.level === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
      });
    case "bullet":
      return new Paragraph({ text: block.text, bullet: { level: 0 } });
    case "numbered":
      return new Paragraph({ text: block.text, numbering: { reference: NUMBERING_REF, level: 0 } });
    default:
      return new Paragraph({ children: [new TextRun(block.text)], spacing: { after: 120 } });
  }
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function metaTable(meta: PolicyDocument["meta"]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: "F5A623" },
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: meta.map(
      (m) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: m.label, bold: true, color: "666666" })] })],
            }),
            new TableCell({
              width: { size: 68, type: WidthType.PERCENTAGE },
              children: [new Paragraph(m.value)],
            }),
          ],
        }),
    ),
  });
}

export function buildPolicyDocx(doc: PolicyDocument): Document {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [new TextRun({ text: doc.orgName.toUpperCase(), color: "666666", size: 22 })],
      spacing: { after: 120 },
    }),
    new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }),
    metaTable(doc.meta),
    new Paragraph({ text: "" }),
  ];
  if (doc.draftNotice) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.draftNotice, bold: true })], spacing: { after: 160 } }));
  }
  if (doc.description) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.description, italics: true })], spacing: { after: 200 } }));
  }
  children.push(...doc.blocks.map(blockParagraph));
  if (doc.systems.length > 0) {
    children.push(new Paragraph({ text: doc.systemsTitle, heading: HeadingLevel.HEADING_3 }));
    children.push(...doc.systems.map((name) => new Paragraph({ text: name, bullet: { level: 0 } })));
  }
  if (doc.stamp.length > 0) {
    children.push(new Paragraph({ text: "" }));
    children.push(
      ...doc.stamp.map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, size: 14, color: "666666" })] }),
      ),
    );
  }

  return new Document({
    creator: doc.orgName,
    title: doc.title,
    numbering: {
      config: [
        {
          reference: NUMBERING_REF,
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `${doc.orgName} · ${doc.title}`, size: 16, color: "666666" })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export async function renderPolicyDocx(doc: PolicyDocument): Promise<Buffer> {
  return Packer.toBuffer(buildPolicyDocx(doc));
}
