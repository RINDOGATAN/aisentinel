// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { createZip, crc32 } from "./zip";
import { buildIcs } from "./ics";

/** Reads the central directory back: names, sizes and data per entry. */
function readZip(zip: Uint8Array) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const endAt = zip.length - 22;
  expect(v.getUint32(endAt, true)).toBe(0x06054b50);
  const count = v.getUint16(endAt + 10, true);
  let p = v.getUint32(endAt + 16, true);
  const out: { name: string; data: Uint8Array; crc: number }[] = [];
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    const localNameLen = v.getUint16(local + 26, true);
    const data = zip.subarray(local + 30 + localNameLen, local + 30 + localNameLen + size);
    out.push({ name, data, crc });
    p += 46 + nameLen;
  }
  return out;
}

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("createZip", () => {
  it("round-trips names (including non-ASCII) and contents", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 255]);
    const zip = createZip([
      { name: "00-LÉAME.md", data: "# Programa\n\nÍndice" },
      { name: "politicas/uso.md", data: "Política de uso" },
      { name: "programa.pdf", data: pdf },
    ]);
    const entries = readZip(zip);
    expect(entries.map((e) => e.name)).toEqual(["00-LÉAME.md", "politicas/uso.md", "programa.pdf"]);
    expect(new TextDecoder().decode(entries[0].data)).toBe("# Programa\n\nÍndice");
    expect([...entries[2].data]).toEqual([...pdf]);
    for (const e of entries) expect(e.crc).toBe(crc32(e.data));
  });

  it("produces a valid empty archive", () => {
    expect(readZip(createZip([]))).toEqual([]);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(
    [
      {
        uid: "art50@aisentinel",
        date: "2026-12-02",
        summary: "Art. 50(2): marking, grace period ends",
        description: "Systems placed on the market before 2 Aug 2026; see the calendar, then act.",
      },
    ],
    { calendarName: "AI obligations", now: new Date("2026-09-11T10:00:00Z") },
  );

  it("writes an all-day event with escaped text", () => {
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261202");
    expect(ics).toContain("DTEND;VALUE=DATE:20261203");
    expect(ics).toContain("SUMMARY:Art. 50(2): marking\\, grace period ends");
    expect(ics).toContain("DTSTAMP:20260911T100000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("folds long lines at 75 octets", () => {
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
