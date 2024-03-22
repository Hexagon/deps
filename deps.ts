import { format, maxSatisfying, parse, parseRange } from "@std/semver";
import { args, ArgsParser, Colors, exit } from "@cross/utils";
import { table } from "@cross/utils/table";
import { parse as parseJsonc } from "@std/jsonc";
import { join } from "@std/path";
import { default as denoJson } from "./deno.json" with { type: "json" };

// Interface for import details
interface ImportDetails {
  name: string;
  current: string | null;
  specifier: string | null;
  latest: string;
  wanted: string | null;
  available: string[];
}

const colorSchemes = {
  outdated: Colors.red,
  unused: Colors.yellow,
  updateAvailable: Colors.yellow,
  upToDate: Colors.green,
};

async function tryReadFile(
  filename: string,
): Promise<DenoJson | undefined> {
  try {
    const text = await Deno.readTextFile(filename);
    const fileContent = parseJsonc(text);
    if (fileContent) {
      return fileContent as unknown as DenoJson;
    } else {
      return {} as DenoJson;
    }
  } catch (_error) {
    // Could log a warning here if needed
  }
}

// Fetches package metadata from jsr.io
async function fetchPackageMeta(
  scope: string,
  name: string,
): Promise<ImportDetails | null> {
  const url = `https://jsr.io/@${scope}/${name}/meta.json`;
  const headers = new Headers({ "Accept": "application/json" });
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const meta = await response.json();
      return {
        name: `@${scope}/${name}`,
        current: null,
        specifier: null,
        latest: meta.latest,
        wanted: null, // Initialize wanted
        available: Object.keys(meta.versions),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching meta:", error);
    return null;
  }
}

function extractVersionFromLock(
  specifiers: unknown,
  scope: string,
  name: string,
): string | null {
  const packageName = `@${scope}/${name}`;

  // Filter for the matching package
  const matchingEntries = Object.entries(specifiers || {})
    .filter(([_, val]) => (val as string || "").includes(packageName));
  if (matchingEntries.length > 0) {
    const [, , version] = (matchingEntries[0][1] as string).split("@"); // Extract from the first match
    return version;
  } else {
    return null;
  }
}

interface DenoPackages {
  specifiers?: string[];
}
interface DenoJson {
  imports?: string[];
  packages?: DenoPackages;
}

// Analyzes dependencies listed in deno.json
async function analyzeDependencies(
  basePath?: string,
): Promise<ImportDetails[]> {
  // Read deno.json
  const sources: DenoJson[] = [];
  for (
    const jsonFilename of ["deno.json", "deno.jsonc", "jsr.json", "jsr.jsonc"]
  ) {
    const currentFile = await tryReadFile(join(basePath || "", jsonFilename));
    if (
      currentFile &&
      Object.prototype.hasOwnProperty.call(currentFile, "imports")
    ) {
      sources.push(currentFile);
    }
  }

  // No sources found
  if (!sources.length) {
    throw new Error("No sources found.");
  }

  // Read deno.lock
  const denoLock = await tryReadFile(join(basePath || "", "deno.lock"));

  const updateInfo: ImportDetails[] = [];

  if (sources.length && sources[0].imports) {
    for (
      const entry of Object.values(sources[0].imports)
    ) {
      const [, packageName, currentVersion] = entry.split("@");
      const [scope, name] = packageName.split("/");
      const meta = await fetchPackageMeta(scope, name);
      if (meta) {
        if (Object.prototype.hasOwnProperty.call(denoLock, "packages")) {
          meta.current = extractVersionFromLock(
            denoLock?.packages?.specifiers,
            scope,
            name,
          );
        } else {
          meta.current = null;
        }
        meta.specifier = currentVersion;

        // Find the latest matching version within the specified range
        const versions = meta.available.map(parse).filter((v) => v !== null);
        const latestMatching = maxSatisfying(
          versions,
          parseRange(currentVersion),
        );
        meta.wanted = latestMatching ? format(latestMatching) : null;

        updateInfo.push(meta);
      }
    }
  }

  return updateInfo;
}

function colorizeUpdateStatus(updateStatus: ImportDetails) {
  if (!updateStatus.specifier || !updateStatus.latest) {
    return "Error"; // Handle missing version info
  }
  if (!updateStatus.current && !parsedArgs.count("ignore-unused")) {
    return colorSchemes.unused(`Unused`);
  } else if (updateStatus.wanted == updateStatus.latest) {
    return colorSchemes.upToDate("OK");
  } else if (updateStatus.wanted != updateStatus.latest) {
    return colorSchemes.outdated("Outdated");
  } else {
    return colorSchemes.unused(`Unused`);
  }
}

// Parse arguments
const parsedArgs = new ArgsParser(args());

// Handle help argument
if (parsedArgs.count("help")) {
  console.log(
    `Usage: deno run -A jsr:@check/deps@${denoJson.version} [options]`,
  );
  console.log("Options:");
  console.log("  --help            Show this help message");
  console.log("  --cwd <dir>       Set the working directory");
  console.log("  --slim            Suppress table output");
  console.log("  --ignore-unused   Don't report on unused packages");
  exit(0);
}

// Entry point
let updates: ImportDetails[] | undefined = undefined;
try {
  const cwd = parsedArgs.get("cwd") as string;
  updates = await analyzeDependencies(cwd || "");
} catch (e) {
  console.error(Colors.red(e.message));
  exit(1);
}

if (!updates) {
  console.error("No sources found.");
  exit(1);
}

// If not silent
if (!parsedArgs.count("slim")) {
  const tableData = updates?.map((update) => [
    update.name || "",
    update.specifier || "",
    update.wanted || "",
    update.latest || "",
    update.wanted ? colorizeUpdateStatus(update) : "Error",
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
const statusCounts = {
  outdated: 0,
  updateAvailable: 0,
  unused: 0,
  upToDate: 0, // Assuming you might have up-to-date packages
};

updates?.forEach((update) => {
  switch (colorizeUpdateStatus(update)) {
    case colorSchemes.outdated("Outdated"):
      statusCounts.outdated++;
      break;
    case colorSchemes.updateAvailable("Update to..."):
      statusCounts.updateAvailable++;
      break;
    case colorSchemes.unused("Unused"):
      statusCounts.unused++;
      break;
    case colorSchemes.upToDate("Up-to-date"):
      statusCounts.upToDate++;
      break;
  }
});

const sumNotOk = statusCounts.outdated + statusCounts.updateAvailable +
  (parsedArgs.count("ignore-unused") ? 0 : statusCounts.unused);

// Message if all dependencies are up-to-date
if (sumNotOk === 0) {
  console.log(Colors.green("All dependencies are up-to-date."));
  if (!parsedArgs.count("slim")) console.log("");
  exit(0);
} else {
  let statusText = "";
  if (statusCounts.outdated + statusCounts.updateAvailable > 0) {
    statusText += Colors.yellow("Updates available. ");
  }
  if (statusCounts.unused > 0) {
    statusText += Colors.yellow("Unused packages found. ");
  }
  console.log(statusText);
  if (!parsedArgs.count("slim")) console.log("");
  exit(1);
}
