# REST API (Swagger)

Supabase auto-generates a PostgREST API for every table, with row-level-security applied at the database. The schema below is fetched live from `https://seskuthiopywrgntsgfw.supabase.co/rest/v1/?apikey=<anon>` and saved to [`/openapi.json`](pathname:///openapi.json).

You can browse + try requests from the dedicated **[Swagger UI page](pathname:///swagger)**.

## Auth

Every request needs both:

```
apikey: <anon-key>
Authorization: Bearer <user-jwt-from-supabase-auth>
```

Without the user JWT, RLS denies everything except rows on `templates` where `is_system = true`.

## Refreshing the spec

When the schema changes, regenerate the bundled OpenAPI spec:

```sh
node website/scripts/fetch-openapi.mjs
```

The script reads `expo.extra.supabaseUrl` + `supabaseAnonKey` from `app.json` and writes `website/static/openapi.json`. Commit the updated file.

## Caveats

- The spec only describes auto-generated PostgREST endpoints (one per table) — it does not include Supabase Auth, Storage, or Realtime.
- This app does **not** use any custom RPC endpoints, so the `rpc/` section is intentionally empty.
- Mobile code in this repo does not call PostgREST over HTTP directly — it goes through `@supabase/supabase-js` ([`lib/supabase.ts`](../lib.md#supabasets)). The Swagger UI is here for backend / integration consumers.
