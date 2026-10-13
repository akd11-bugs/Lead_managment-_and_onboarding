import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    extends: [...nextCoreWebVitals, security.configs.recommended],
  },
  {
    // sonarjs's own "recommended" preset bundles in a lot of general
    // code-quality rules (cognitive complexity, nested ternaries, unused
    // vars) that have nothing to do with security — cherry-picking just the
    // rules that actually catch a security-relevant pattern (ReDoS, SQL
    // built from a query string, cleartext protocols, unsafe randomness,
    // PATH-relative command execution), all as warnings so this doesn't
    // start failing CI over pre-existing, already-reviewed code.
    plugins: { sonarjs },
    rules: {
      "sonarjs/super-linear-regex": "warn", // ReDoS-shaped regex
      "sonarjs/sql-queries": "warn", // SQL built from a string instead of a parameterized call
      "sonarjs/no-clear-text-protocols": "warn", // http:// where https:// was meant
      "sonarjs/pseudo-random": "warn", // Math.random() used somewhere security-sensitive
      "sonarjs/no-os-command-from-path": "warn", // spawning a binary resolved from $PATH instead of an absolute path
    },
  },
]);