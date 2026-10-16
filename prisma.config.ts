import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Match Next.js's precedence: .env.local overrides .env. Plain `dotenv/config`
// reads only .env, so without this the Prisma CLI and any `node script.mjs`
// would keep talking to the URL in .env (Neon / production) even when
// .env.local points local work at the Docker database. dotenv does not
// overwrite already-set vars, so .env.local must be loaded first.
loadEnv({ path: '.env.local' })
loadEnv()

// `prisma generate` (run from postinstall on every deploy) only needs the
// schema file, not a live DATABASE_URL — but prisma/config's `env()` helper
// throws if the var is unset, which fails the build before Vercel injects
// runtime secrets. Read it directly with a fallback so `generate` never
// depends on DATABASE_URL being present; `migrate`/`studio` still pick up
// the real value from the environment when it is.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
