import { default as denoJson } from "../deno.json" with { type: "json" };
import { args, ArgsParser, Colors, exit } from "@cross/utils";
import { table } from "@cross/utils/table";
import { UpdateStatistics } from "./stats.ts";
import { Package } from "./package.ts";

export function parseArgs() {
  return new ArgsParser(args());
}

export function printHelpAndExit() {
  console.log(
    `Usage: deno run -A jsr:@check/deps@${denoJson.version} [options]`,
  );
  console.log("Options:");
  console.log("  --help            Show this help message");
  console.log("  --cwd <dir>       Set the working directory");
  console.log("  --slim            Suppress table output");
  console.log("  --ignore-unused   Don't report on unused packages");
}

export const colorSchemes = {
  outdated: Colors.red,
  unused: Colors.yellow,
  upToDate: Colors.green,
  unsupported: Colors.dim,
  builtin: Colors.green,
};

export function updateStatusText(p: Package, ignoreUnused: boolean): string {
  let text = "";
  if (p.isOutdated()) text += colorSchemes.outdated("Outdated ");
  if (p.isUpToDate()) text += colorSchemes.upToDate("Up-to-date ");
  if (!p.isSupported()) text += colorSchemes.unsupported("Unsupported ");
  if (p.isBuiltIn()) text += colorSchemes.builtin("Built-in ");
  if (p.isUnused() && !ignoreUnused) text += colorSchemes.unused(`Unused `);
  return text;
}

export function printTable(packages: Package[], ignoreUnused: boolean) {
  const tableData = packages?.map((p) => [
    `${p.registry}:${p.name}${(p.specifier ? ("@" + p.specifier) : "")}`,
    p.wanted || "",
    p.latest || "",
    updateStatusText(p, ignoreUnused),
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
  ignoreUnused: boolean,
) {
  const sumNotOk = statusCounts.outdated +
    (ignoreUnused ? 0 : statusCounts.unused);

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
    if (statusCounts.unused > 0 && !ignoreUnused) {
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
  exit(1);
}
