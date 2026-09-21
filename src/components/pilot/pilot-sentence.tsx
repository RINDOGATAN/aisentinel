// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The pilot sentence with its two links, rendered the same way wherever it
 * appears: the banner, the sign-up screens and the Settings card. No hooks
 * and no translation lookup, so it renders on the server, on the client and
 * in a test without the app shell.
 */

import { PILOT_RUN_URL, type PilotSentence } from "@/config/pilot";
import { DISCLOSURE_DOCS_PATH } from "@/config/pilot-disclosure";

export function PilotSentenceText({ sentence, linkClassName }: { sentence: PilotSentence; linkClassName: string }) {
  return (
    <>
      {sentence.before}
      <a href={DISCLOSURE_DOCS_PATH} className={linkClassName}>
        {sentence.docs}
      </a>
      {sentence.middle}
      <a href={PILOT_RUN_URL} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {sentence.link}
      </a>
      {sentence.after}
    </>
  );
}
