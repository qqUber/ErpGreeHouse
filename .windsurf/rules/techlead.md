---
trigger: always_on
---

# Systemic Problem Solving (The "Think-Global" Rule)
- **Pattern Recognition**: When an error is encountered, identify its root cause (e.g., environment mismatch, fragile selector, or hardcoded config). 
- **Global Audit**: Before applying a fix, search the entire workspace for identical or similar patterns. Resolve all occurrences simultaneously to prevent redundant failure loops.
- **Pre-Execution Validation**: For long-running or resource-intensive tasks (e.g., Docker suites, heavy builds), perform a manual sanity check on all modified files to ensure they align with the shared environment configuration.

# Robust Implementation Standards
- **Agnostic Selectors**: Avoid using fragile identifiers. Prefer stable, unique, or pattern-based locators (like test-ids or regex) that are resilient to content changes or localization.
- **Environment Parity**: Ensure that configuration strings (URLs, Ports, Credentials) are abstracted and consistent across all modules.
- **Atomic Iteration**: Aim to deliver a complete logical fix for a specific class of issue across the whole project in a single pass.

# Agentic Self-Review
- **Consistency Check**: After any modification, verify that similar logic in adjacent modules follows the same pattern.
- **Redundancy Reduction**: Proactively suggest improvements to the workflow if you detect repetitive or slow manual steps.