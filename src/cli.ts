/**
 * This file contains the CLI logic for @check/deps.
 *
 * It's responsible for:
 *  * Argument parsing
 *  * Output formatting (table and summary stats)
 *  * Error handling
 *  * Colorization of output
 */

import { default as denoJson } from "../deno.json" with { type: "json" };
import { args, ArgsParser, Colors, exit } from "@cross/utils";
import { table } from "@cross/utils/table";
import type { UpdateStatistics } from "./stats.ts";
import type { Package } from "./package.ts";

export function parseArgs() {
  return new ArgsParser(args());
}

export function printHelpAndExit() {
  console.log(
    `Usage: deno run -A jsr:@check/deps@${denoJson.version} [options]`,
  );
  console.log("Options:");
  console.log("  --help            Show this help message");
  console.log("  --target <dir>    Set the target project path");
  console.log("  --slim            Suppress table output");
  console.log("  --pre-release     Treat latest pre-release as latest");
  console.log("  --allow-unused    Don't report on unused packages");
}

export const colorSchemes = {
  outdated: Colors.red,
  unused: Colors.yellow,
  upToDate: Colors.green,
  unsupported: Colors.dim,
  builtin: Colors.green,
  prerelease: Colors.yellow,
};

/**
 * Formats and returns a descriptive text string representing a package's status
 * (outdated, unused, etc.)
 * @param p The Package object to analyze
 * @param allowUnused If true, unused packages will not be highlighted in the text
 * @returns A formatted string representing the package's state
 */
function packageStatusText(
  p: Package,
  allowUnused: boolean,
  preRelease: boolean,
): string {
  let text = "";
  if (p.isOutdated()) text += colorSchemes.outdated("Outdated ");
  if (p.isPreRelease()) {
    text += preRelease
      ? colorSchemes.prerelease("Pre-Release ")
      : colorSchemes.upToDate("Up-to-date (Pre-Release) ");
  }
  if (p.isUpToDate() && !p.isPreRelease()) {
    text += colorSchemes.upToDate("Up-to-date ");
  }
  if (!p.isSupported()) text += colorSchemes.unsupported("Unsupported ");
  if (p.isBuiltIn()) text += colorSchemes.builtin("Built-in ");
  if (p.isUnused() && !allowUnused) text += colorSchemes.unused(`Unused `);
  return text;
}

/**
 * Prints a tabular representation of the provided packages.
 * @param packages An array of Package objects
 * @param allowUnused If true, unused packages will be included without warnings
 * @param preRelease Treat pre-releases as latest
 */
export function printTable(
  packages: Package[],
  allowUnused: boolean,
  preRelease: boolean,
) {
  const tableData = packages?.map((p) => [
    `${p.registry}:${p.name}${(p.specifier ? ("@" + p.specifier) : "")}`,
    p.wanted || "",
    p.latest || "",
    packageStatusText(p, allowUnused, preRelease),
  ]);

  tableData?.unshift([
    Colors.bold("Package"),
    Colors.bold("Wanted"),
    Colors.bold("Latest"),
    Colors.bold(""),
  ]);

  // Print the table
  if (tableData) {
    console.log("");
    table(tableData);
    console.log("");
  }
}

export function printStatsAndExit(
  statusCounts: UpdateStatistics,
  slim: boolean,
  allowUnused: boolean,
) {
  const sumNotOk = statusCounts.outdated +
    (allowUnused ? 0 : statusCounts.unused);

  // Message if all dependencies are up-to-date
  if (sumNotOk === 0) {
    console.log(Colors.green("All dependencies are up-to-date."));
    if (!slim) console.log("");
    exit(0);
  } else {
    let statusText = "";
    if (statusCounts.outdated > 0) {
      statusText += Colors.yellow("Updates available. ");
    }
    if (statusCounts.unused > 0 && !allowUnused) {
      statusText += Colors.yellow("Unused packages found. ");
    }
    console.log(statusText);
    if (!slim) console.log("");
    exit(1);
  }
}

export function printErrorAndExit(e: Error) {
  console.error(Colors.red(e.message));
  exit(1);
}

export function printSuccessAndExit(message: string) {
  console.error(Colors.green(message));
  exit(0);
}
