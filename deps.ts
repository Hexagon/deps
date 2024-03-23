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
try {
  const workingDir = parsedArgs.get("cwd");
  if (workingDir === true) {
    printErrorAndExit(new Error("--cwd passed without a path"));
  }
  lockFile = await tryReadJsoncFile(
    getDenoLockPath(workingDir as string | undefined || ""),
  );

  packages = await analyzeDependencies(
    lockFile,
    workingDir as string | undefined || "",
  );
} catch (e) {
  console.log(e);
  printErrorAndExit(e.message);
}

// Automatically set ignore
const ignoreUnused = parsedArgs.count("ignore-unused") > 0 || !lockFile;

// If packages were found
if (packages) {
  // If not silent, print table
  if (!parsedArgs.count("slim") && packages) {
    printTable(packages, ignoreUnused);
  }

  printStatsAndExit(stats(packages), !!parsedArgs.count("slim"), ignoreUnused);

  // If no packages were found
} else {
  printSuccessAndExit("No dependencies found.");
}
