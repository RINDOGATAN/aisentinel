// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Help me decide": three yes or no questions that suggest the organisation's
 * role for one AI system under Reg. (EU) 2024/1689.
 *
 * - Provider (Art. 3(3)): develops an AI system, or has it developed, and
 *   places it on the market or puts it into service under its own name or
 *   trademark, whether for payment or free of charge. Putting into service
 *   (Art. 3(11)) includes supplying it for the organisation's own use.
 * - Deployer (Art. 3(4)): uses an AI system under its authority, except in a
 *   personal, non-professional activity.
 *
 * The questions follow those two definitions. When both hold, the provider
 * role is suggested and the deployer duties are flagged as applying as well.
 * When neither holds, nothing is suggested: the organisation may be an
 * importer or distributor (Art. 3(6), 3(7)) or outside the chain. A suggestion
 * is only that: the person chooses the role.
 *
 * Pure: no React.
 */

export type YesNo = "yes" | "no";

export interface RoleAnswers {
  /** Did the organisation develop the system, or have it developed for it? */
  developed?: YesNo;
  /** Is it made available or put into use under the organisation's own name or trademark? */
  ownName?: YesNo;
  /** Does the organisation use it in its work, under its own authority? */
  usesIt?: YesNo;
}

export const ROLE_QUESTIONS = ["developed", "ownName", "usesIt"] as const;

export type RoleOutcome = "incomplete" | "provider" | "providerAndDeployer" | "deployer" | "neither";

export interface RoleSuggestion {
  outcome: RoleOutcome;
  /** The role to offer; null when the answers are incomplete or point to neither. */
  role: "PROVIDER" | "DEPLOYER" | null;
}

export function suggestRole(answers: RoleAnswers): RoleSuggestion {
  if (ROLE_QUESTIONS.some((q) => answers[q] === undefined)) {
    return { outcome: "incomplete", role: null };
  }
  const provider = answers.developed === "yes" && answers.ownName === "yes";
  const deployer = answers.usesIt === "yes";
  if (provider) {
    return { outcome: deployer ? "providerAndDeployer" : "provider", role: "PROVIDER" };
  }
  if (deployer) return { outcome: "deployer", role: "DEPLOYER" };
  return { outcome: "neither", role: null };
}
