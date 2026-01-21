# Project Best Practices (2026)

## Stack Targets (verify before upgrades)

- Next.js 16.1 (App Router)
- React 19.2
- Tailwind CSS 4.1
- Vitest 4
- Zod 4
- shadcn/ui (new-york style)

## Next.js (App Router)

- Server Components by default; add "use client" only at boundaries.
- Prefer Server Actions for mutations; use route handlers for external integrations.
- Use loading.tsx, error.tsx, not-found.tsx for route segments.
- Be explicit about fetch caching (cache, revalidate, tags).

## React

- Effects must be idempotent; cleanup async work with AbortController.
- Prefer derived values over duplicated state.
- Memoize only when expensive or for referential stability.
- Avoid side effects in render; keep effects narrow.

## TypeScript

- Avoid any; use unknown plus type guards.
- Use interfaces or types for payloads; use `satisfies` for config objects.
- Prefer `??` over `||` for defaults.
- Use optional chaining for nested access.

## shadcn/ui and Tailwind

- Use shadcn components for inputs, buttons, cards, badges, dialogs.
- Keep layout utilities in the page; keep component styling inside shadcn components.
- Standardize the `cn` helper with `clsx` plus `tailwind-merge` in `src/lib/utils`.
- Prefer design tokens in tailwind config over ad-hoc colors.
- Avoid heavy `@apply` in Tailwind v4.

## Zod

- Validate at the boundary; use `safeParse`.
- Use `z.infer` for derived types.
- Use `z.preprocess` or `z.coerce` for form inputs.
- Centralize error mapping for consistent API responses.

## Testing (Vitest)

- Prefer Testing Library for UI and `renderHook` for hooks.
- Use `vi.mock` and `vi.restoreAllMocks` in teardown.
- Focus on behavior over implementation details.
