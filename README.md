# Prompify CRM template

Atomic CRM by Marmelab (MIT, see `LICENSE.md`), connected to Prompify's database.

- **Inside Prompify**: data is loaded from and saved to the Prompify tables listed in `.bolt/prompt`
  (see `src/components/atomic-crm/providers/prompify`).
- **Locally**: `npm install && npm run dev` runs it with Atomic CRM's generated demo data.

Removed from the original: login/sign-up, Supabase backend, user management, settings page,
CSV/JSON import, changelog, global search, contact merging, French translation, telemetry,
offline cache, tests, Storybook and docs.

The component library (`src/components/admin` and `src/components/ui` in Atomic CRM) lives in the
`prompify-crm-kit` package (folder `../crm-kit`), so it is installed rather than part of the
template. `package.json` currently points at a local tarball; it must point at a public URL
before the template is used in Prompify.
