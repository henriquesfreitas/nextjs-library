# Context7 Usage

When writing new code or reviewing existing code that involves any library, framework, or SDK from the project's tech stack, always use the Context7 power to look up current documentation before proceeding.

## When to Use

- Writing or modifying code that uses a library API (Next.js, React, Zod, pg, Pino, Vitest, fast-check, etc.)
- Reviewing code for correctness against current library documentation
- Answering questions about library usage, configuration, or best practices
- Implementing patterns that depend on framework-specific behavior (e.g., App Router conventions, Zod schema composition)

## How to Use

1. Call `resolve-library-id` with the relevant library name and the task context
2. Call `query-docs` with the resolved library ID and a specific question about what you need

## Goal

Ensure all generated and reviewed code reflects the latest API surface and recommended patterns, rather than relying on potentially outdated training data.