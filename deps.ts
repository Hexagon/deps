import {
  parseArgs,
  printErrorAndExit,
  printHelpAndExit,
  printStatsAndExit,
  printSuccessAndExit,
  printTable,
} from "./src/cli.ts";
import { tryReadJsoncFile } from "./src/utils.ts";
import { stats } from "./src/stats.ts";
import { type DenoLock, getDenoLockPath } from "./src/lockfile.ts";
import { analyzeDependencies } from "./src/analyzer.ts";
import type { Package } from "./src/package.ts";

async function main() {
  // Parse arguments
  const parsedArgs = parseArgs();

  // Handle help argument
  if (parsedArgs.count("help")) {
    printHelpAndExit();
  }

  // Entry point
  let packages: Package[] | null = null;
  let lockFile: DenoLock | null = null;

  const targetPath = parsedArgs.get("target");
  if (targetPath?.toString() === "true") {
    printErrorAndExit(new Error("--target passed without a path"));
  }

  // Read lockfile
  try {
    lockFile = await tryReadJsoncFile(
      getDenoLockPath(targetPath as string | undefined || ""),
    );
  } catch (_e) {
    // Ignore, lock file really not needed
  }

  // Treat pre-releases as latest
  const preRelease = parsedArgs.count("pre-release") > 0;

  // Analyze the dependencies, exit on error
  try {
    packages = await analyzeDependencies(
      lockFile,
      targetPath as string | undefined || "",
      preRelease,
    );
  } catch (e) {
    printErrorAndExit(e as Error);
  }

  // Automatically set ignore
  const allowUnused = parsedArgs.count("allow-unused") > 0 || !lockFile;

  // If packages were found
  if (packages) {
    // If not silent, print table
    if (!parsedArgs.count("slim") && packages) {
      printTable(packages, allowUnused);
    }

    printStatsAndExit(stats(packages), !!parsedArgs.count("slim"), allowUnused);

    // If no packages were found
  } else {
    printSuccessAndExit("No dependencies found.");
  }
}

if (import.meta.main) main();

export * from "./src/configfile.ts";
export * from "./src/jsr.ts";
export * from "./src/npm.ts";
export * from "./src/lockfile.ts";
export * from "./src/package.ts";
export * from "./src/utils.ts";
