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
import { DenoLock, getDenoLockPath } from "./src/lockfile.ts";
import { analyzeDependencies } from "./src/analyzer.ts";
import { Package } from "./src/package.ts";

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

// Analyze the dependencies, exit on error
try {
  packages = await analyzeDependencies(
    lockFile,
    targetPath as string | undefined || "",
  );
} catch (e) {
  printErrorAndExit(e);
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
