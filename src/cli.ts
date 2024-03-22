import { default as denoJson } from "../deno.json" with { type: "json" };
import { args, ArgsParser, Colors, exit } from "@cross/utils";
import { table } from "@cross/utils/table";
import { getUpdateStatus, ImportDetails, UpdateStatus } from "./status.ts";
import { UpdateStatistics } from "./stats.ts";

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
  updateAvailable: Colors.yellow,
  upToDate: Colors.green,
};

export function updateStatusText(updateStatus: UpdateStatus): string {
  switch (updateStatus) {
    case UpdateStatus.Unknown:
      return "Error";
    case UpdateStatus.Unused:
      return colorSchemes.unused(`Unused`);
    case UpdateStatus.UpToDate:
      return colorSchemes.upToDate("Up-to-date");
    case UpdateStatus.Outdated:
      return colorSchemes.outdated("Outdated");
  }
}

export function printTable(updates: ImportDetails[]) {
  const tableData = updates?.map((update) => [
    update.name || "",
    update.specifier || "",
    update.wanted || "",
    update.latest || "",
    update.wanted ? updateStatusText(getUpdateStatus(update)) : "Error",
  ]);

  tableData?.unshift([
    Colors.bold("Package"),
    Colors.bold("Specifier"),
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
  ignoreUnused: boolean,
  slim: boolean,
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
    if (statusCounts.unused > 0) {
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
