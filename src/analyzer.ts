import { format, maxSatisfying, parse, parseRange } from "@std/semver";
import { parseImportEntry, readDenoConfig } from "./configfile.ts";
import { DenoLock, extractVersionFromLock } from "./lockfile.ts";
import { ImportDetails } from "./status.ts";

export function analyzePackageVersions(
  packageDetails: ImportDetails,
  denoLock: DenoLock | null,
): ImportDetails {
  // Find the currently used version in denoLock (if it exists)
  packageDetails.current = extractVersionFromLock(denoLock, packageDetails);
  // Find the latest matching version within the specified range
  const versions = packageDetails.available.map(parse).filter((v) =>
    v !== null
  );
  if (packageDetails.specifier) {
    const latestMatching = maxSatisfying(
      versions,
      parseRange(packageDetails.specifier),
    );
    packageDetails.wanted = latestMatching ? format(latestMatching) : null;
  }

  return packageDetails;
}

export async function analyzeDependencies(
  denoLock: DenoLock | null,
  basePath: string,
): Promise<ImportDetails[] | null> {
  // Get all config files
  const denoConfigs = await readDenoConfig(basePath);

  // Require at least one config file, use the first
  const firstConfigFile = denoConfigs.find((configFile) => configFile.imports);
  if (!firstConfigFile) {
    return null;
  } else {
    // Download metadata for all packages
    const importsClause = firstConfigFile?.imports;
    if (importsClause) {
      const importPromises = Object.values(importsClause).map(async (
        entry: string,
      ) => await parseImportEntry(entry));
      const importDetails = await Promise.all(importPromises);
      return importDetails.map((meta) =>
        analyzePackageVersions(meta, denoLock)
      );
    } else {
      return [];
    }
  }
}
