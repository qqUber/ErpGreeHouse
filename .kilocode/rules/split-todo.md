# Continuation Rules for Kilocode CLI

## Principle
- If context size exceeds limits, **do not truncate randomly or stuck**.

## Continuation Strategy
- Split tasks and todos into smaller prompts or phases.
- Use `STATE.md` and `ROADMAP.md` to keep track of progress.

## Dependencies
- Ensure reproducibility by locking versions where needed.

## Outcome
- Work continues seamlessly even if context is too large.
- No loss of environment or business logic.