"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The four yes or no questions that switch the customer-facing chatbot
 * overlay on. Controlled: the caller keeps the answers and saves them, so the
 * same questions serve the registration form and the system's own tab.
 */

import { useTranslations } from "next-intl";
import {
  CHATBOT_QUESTIONS,
  type ChatbotAnswer,
  type ChatbotFacts,
  type ChatbotQuestion,
} from "@/config/chatbot-overlay";

const OPTIONS: ChatbotAnswer[] = ["YES", "NO", "NOT_ASSESSED"];

export function ChatbotQuestions({
  value,
  onChange,
  disabled = false,
}: {
  value: ChatbotFacts;
  onChange: (question: ChatbotQuestion, answer: ChatbotAnswer) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("chatbotOverlay");
  return (
    <div className="space-y-4">
      {CHATBOT_QUESTIONS.map((q, i) => (
        <fieldset key={q} className="space-y-1.5">
          <legend className="text-sm font-medium">
            {`Q${i + 1}. `}
            {t(`question.${q}.label`)}
          </legend>
          <p className="text-xs text-muted-foreground">{t(`question.${q}.help`)}</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t(`question.${q}.label`)}>
            {OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={value[q] === opt}
                disabled={disabled}
                onClick={() => onChange(q, opt)}
                className={[
                  "rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                  value[q] === opt
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40",
                ].join(" ")}
              >
                {t(`answer.${opt}`)}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
