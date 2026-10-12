// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  BLOCKED_EMAIL_MESSAGES,
  blockedEmailMessage,
  isBlockedAccountEmail,
  isBlockedEnquiryEmail,
  isDottedGmail,
} from "@/lib/email-policy";

const REFUSED = [
  "b.ake.r.miche.ll.eba.hpc.y.jx@gmail.com",
  "B.AKE.R.MICHE.LL.EBA.HPC.Y.JX@GMAIL.COM",
  "a.b.c.d@googlemail.com",
  "a.b.c.d+x@gmail.com",
  "someone@hotmail.com",
  "SOMEONE@HOTMAIL.COM",
  "x@hotmail.co.uk",
  "x@hotmail.fr",
  "x@hotmail.com.ar",
  "x@mx.hotmail.com",
  "x@aol.com",
  "X@AOL.CO.UK",
  "x@aol.de",
];

const ACCEPTED = [
  "first.last@gmail.com",
  "FIRST.LAST@GMAIL.COM",
  "a.b.c@gmail.com",
  "a.b+c.d.e@gmail.com",
  "a.b.c.d@example.com",
  "x@aol.example.com",
  "x@nothotmail.com",
  "x@hotmailer.com",
  "x@outlook.com",
];

describe("e-mail policy: accounts (sign-up, sign-in, invitations)", () => {
  it.each(REFUSED)("refuses %s", (email) => {
    expect(isBlockedAccountEmail(email)).toBe(true);
  });
  it.each(ACCEPTED)("accepts %s", (email) => {
    expect(isBlockedAccountEmail(email)).toBe(false);
  });
  it("never throws on non-addresses", () => {
    for (const v of ["", "nonsense", "@gmail.com", null, undefined, 42]) {
      expect(isBlockedAccountEmail(v)).toBe(false);
    }
  });
});

describe("e-mail policy: enquiry forms (rule 1 only)", () => {
  it("refuses the dotted Gmail, in any case", () => {
    expect(isBlockedEnquiryEmail("b.ake.r.miche.ll.eba.hpc.y.jx@gmail.com")).toBe(true);
    expect(isBlockedEnquiryEmail("B.AKE.R.MICHE.LL.EBA.HPC.Y.JX@GMAIL.COM")).toBe(true);
    expect(isDottedGmail("a.b.c.d@googlemail.com")).toBe(true);
  });
  it("keeps hotmail and aol open", () => {
    expect(isBlockedEnquiryEmail("x@hotmail.com")).toBe(false);
    expect(isBlockedEnquiryEmail("X@AOL.COM")).toBe(false);
  });
});

describe("e-mail policy: message", () => {
  it("is the same sentence for both rules, per language", () => {
    expect(blockedEmailMessage("en")).toBe(
      "Please use your work e-mail address, or a different personal address. We can't accept this one.",
    );
    expect(blockedEmailMessage("es")).toBe(
      "Usa tu correo del trabajo u otra dirección personal. No podemos aceptar esta.",
    );
    expect(blockedEmailMessage(undefined)).toBe(BLOCKED_EMAIL_MESSAGES.en);
  });
});
