import { maxSatisfying, parse, format, parseRange, compare } from "@std/semver";
import { exit, Colors } from "@cross/utils";
import { renderTable } from "./table.ts";


// Interface for import details
interface ImportDetails {
  name: string;
  current: string | null;
  specifier: string | null;
  latest: string;
  wanted: string | null; 
  available: string[]
}

const colorSchemes = {
  outdated: Colors.red,
  unused: Colors.yellow,
  updateAvailable: Colors.yellow,
  upToDate: Colors.green
};

// Fetches package metadata from jsr.io
async function fetchPackageMeta(scope: string, name: string): Promise<ImportDetails | null> {
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
        available: Object.keys(meta.versions)
      };
    } else {
      return null;  
    }
  } catch (error) {
    console.error("Error fetching meta:", error);
    return null;
  }
}

function extractVersionFromLock(specifiers: any, scope: string, name: string): string | null {
  const packageName = `@${scope}/${name}`; 

  // Filter for the matching package  
  const matchingEntries = Object.entries(specifiers || {}) 
                            .filter(([_, val]) => (val as string || "").includes(packageName)); 
  if (matchingEntries.length > 0) {
    const [, , version] = (matchingEntries[0][1] as string).split('@'); // Extract from the first match
    return version;
  } else {
    return null;
  }
}

// Analyzes dependencies listed in deno.json
async function analyzeDependencies(denoJsonPath: string): Promise<ImportDetails[]> {
  
  // Read deno.json
  const denoJsonText = await Deno.readTextFile(denoJsonPath);
  const denoJson = JSON.parse(denoJsonText);

  // Read deno.lock
  const denoLockPath = denoJsonPath.replace("deno.json", "deno.lock");
  const denoLockText = await Deno.readTextFile(denoLockPath);
  const denoLock = JSON.parse(denoLockText);

  const updateInfo: ImportDetails[] = [];
  for (const [_importName, versionSpecifier] of Object.entries(denoJson.imports)) {
    const [, packageName, currentVersion] = (versionSpecifier as string).split("@"); 
    const [scope, name] = packageName.split("/");
    const meta = await fetchPackageMeta(scope, name);
    if (meta) {
      meta.current = extractVersionFromLock(denoLock.packages.specifiers, scope, name);
      meta.specifier = currentVersion;

      // Find the latest matching version within the specified range
      const versions = meta.available.map(parse).filter(v => v !== null);
      const latestMatching = maxSatisfying(versions, parseRange(currentVersion));
      meta.wanted = latestMatching ? format(latestMatching) : null;

      updateInfo.push(meta); 
    }
  }

  return updateInfo;
}

function colorizeUpdateStatus(updateStatus: ImportDetails) {
  if (!updateStatus.specifier || !updateStatus.latest) {
     return "Error"; // Handle missing version info
  }
  if (!updateStatus.current) {
    return colorSchemes.unused(`Unused`);
  } else 
  if (updateStatus.wanted == updateStatus.latest) {
    return colorSchemes.upToDate("Up-to-date");
  } else if (updateStatus.wanted != updateStatus.latest) {
    return colorSchemes.outdated("Outdated");
  } else {
    return colorSchemes.unused(`Unused`);
  }
}

// Entry point 
const updates = await analyzeDependencies("./deno.json");

const tableData = updates.map(update => [
    update.name || "",
    update.specifier || "",
    update.wanted || "",
    update.latest || "",
    update.wanted ? colorizeUpdateStatus(update) : "Error"
]);

tableData.unshift([
  Colors.bold("Package"),
  Colors.bold("Specifier"),
  Colors.bold("Wanted"),
  Colors.bold("Latest"),
  Colors.bold("")
]);

// Print the table

console.log("");
renderTable(tableData); 
console.log("");

const statusCounts = {
  outdated: 0,
  updateAvailable: 0,
  unused: 0,
  upToDate: 0 // Assuming you might have up-to-date packages 
};

updates.forEach(update => {
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

const sumNotOk = statusCounts.outdated + statusCounts.updateAvailable + statusCounts.unused;

// Message if all dependencies are up-to-date
if (sumNotOk === 0) {
  console.log(Colors.green("All dependencies are up-to-date.\n"));
  exit(0);
} else {
  console.log(Colors.yellow("Updates available.\n"));
  exit(1);
}