# Changelog

All notable changes to AI SENTINEL are documented in this file.

## [Unreleased]

### Changed
- Payments and self-service billing removed from the hosted posture. When billing is disabled (`NEXT_PUBLIC_STRIPE_ENABLED=false`), the previously-premium assessments (Conformity, Bias & Fairness) and the Shadow AI and Vendor Catalog add-ons are available to everyone without an entitlement record. The premium value moves to LQAI skill downloads; the in-app paid gates stay dormant behind the feature flag and remain reversible if billing is switched back on.
