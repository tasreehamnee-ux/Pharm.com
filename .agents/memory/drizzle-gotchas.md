---
name: Drizzle ORM + node-postgres gotchas
description: Two recurring pitfalls when writing Express/Drizzle routes validated with Zod-from-OpenAPI schemas.
---

## Numeric columns come back as strings
Postgres `numeric`/`decimal` columns are returned by `drizzle-orm/node-postgres` as JS strings, not numbers, to avoid float precision loss. If the OpenAPI-generated Zod response schema declares a field as `zod.number()`, parsing the raw DB row will throw a `ZodError`.

**Why:** Orval/OpenAPI codegen has no visibility into DB column types, so it emits `number` for price/total/amount fields, but Drizzle+pg give you `string` for those same columns.

**How to apply:** Write a small `serialize*` helper per entity that does `Number(row.priceField)` before passing to `ResponseSchema.parse(...)`. Apply it consistently across list/get/create/update handlers — easy to forget on one of them.

## `sql\`col = ANY(${array})\`` fails with node-postgres
Using raw `sql` template literals with `ANY(${array})` for "where id in [...]" queries throws a query execution error under the `pg` driver (parameter binding doesn't coerce arrays correctly in this context).

**Why:** node-postgres doesn't automatically bind JS arrays as SQL arrays inside a raw `ANY()` fragment the way some other drivers/ORMs do.

**How to apply:** Always use Drizzle's built-in `inArray(column, array)` helper instead of hand-rolled `ANY()` SQL for "match any of these IDs" queries.
