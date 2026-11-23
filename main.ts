// EMBER CLASH — the entrypoint that hands this game in (Node 22,
// standard library only). It stages the finished game and its four
// screenshots into the output directory the grader reads, then writes
// the dossier the judge sees, using the vendored make.fun library to
// build it. The game itself is plain static files under game/ — a
// DOM card battler that plays offline with no build step and no
// network request.
//
// Run it from this repository root:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; with
// no variable set it writes straight to /output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The repository root is the folder this file lives in.
const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Start from a clean slate so a stale file from an earlier run can
// never ride along into the dossier.
mkdirSync(outputDir, { recursive: true });
rmSync(join(outputDir, "game"), { recursive: true, force: true });
rmSync(join(outputDir, "screenshots"), { recursive: true, force: true });

cpSync(join(repoRoot, "game"), join(outputDir, "game"), { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
if (existsSync(join(repoRoot, "screenshots"))) {
  cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files, in all, or a path under game/ over 1000 bytes).
writeFileSync(
  join(outputDir, "dossier.json"),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log("wrote " + join(outputDir, "dossier.json"));
