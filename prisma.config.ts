import 'dotenv/config'
import { defineConfig } from 'prisma/config'

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
