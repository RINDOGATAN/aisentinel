#!/usr/bin/env bash
# Security convention linter for AI Sentinel governance routers
# Run: npm run lint:security
# Checks for common security anti-patterns that bypass org isolation or RBAC.

set -euo pipefail

ROUTERS_DIR="src/server/routers/governance"
ERRORS=0

echo "Security lint: checking $ROUTERS_DIR"
echo "────────────────────────────────────────"

# 1. Mutations using organizationProcedure instead of orgWriteProcedure
# Allowed: query endpoints. Blocked: .mutation() after organizationProcedure
MUTATIONS_ON_READ=$(grep -rn 'organizationProcedure' "$ROUTERS_DIR" \
  | grep -v 'orgWriteProcedure' \
  | grep -v 'import ' \
  | grep -v '\.query(' \
  | grep -v '//' \
  || true)

if [ -n "$MUTATIONS_ON_READ" ]; then
  # Check if any of these are followed by .mutation in the same endpoint
  while IFS= read -r line; do
    FILE=$(echo "$line" | cut -d: -f1)
    LINENO=$(echo "$line" | cut -d: -f2)
    # Look ahead 5 lines for .mutation(
    CONTEXT=$(sed -n "${LINENO},$((LINENO + 5))p" "$FILE")
    if echo "$CONTEXT" | grep -q '\.mutation('; then
      echo "FAIL: Mutation using organizationProcedure (should be orgWriteProcedure)"
      echo "  $line"
      ERRORS=$((ERRORS + 1))
    fi
  done <<< "$MUTATIONS_ON_READ"
fi

# 2. Unscoped findUnique (returns data without org filter after updateMany)
UNSCOPED_FIND=$(grep -rn 'findUnique({ where: { id' "$ROUTERS_DIR" || true)
if [ -n "$UNSCOPED_FIND" ]; then
  while IFS= read -r line; do
    # Exclude global tables (vendorCatalog, organization, user, complianceMapping)
    if echo "$line" | grep -qE '(vendorCatalog|organization|user|complianceMapping|OrganizationMember)'; then
      continue
    fi
    echo "FAIL: Unscoped findUnique (should use findFirst with organizationId)"
    echo "  $line"
    ERRORS=$((ERRORS + 1))
  done <<< "$UNSCOPED_FIND"
fi

# 3. z.string() used for known Prisma enum fields (should be z.enum)
# Check for common enum field names with z.string() instead of z.enum()
UNSAFE_ENUMS=$(grep -rn 'status: z\.string()\|type: z\.string()\|riskLevel: z\.string()\|severity: z\.string()\|gateType: z\.string()\|technique: z\.string()\|role: z\.string()' "$ROUTERS_DIR" || true)
if [ -n "$UNSAFE_ENUMS" ]; then
  while IFS= read -r line; do
    echo "WARN: Enum field using z.string() (should use z.enum([...]))"
    echo "  $line"
    ERRORS=$((ERRORS + 1))
  done <<< "$UNSAFE_ENUMS"
fi

echo "────────────────────────────────────────"
if [ $ERRORS -eq 0 ]; then
  echo "PASS: No security issues found"
  exit 0
else
  echo "FAIL: $ERRORS issue(s) found"
  exit 1
fi
