import { readDenoConfig } from "./configfile.ts";
import { DenoLock } from "./lockfile.ts";
import { Package } from "./package.ts";

export async function analyzeDependencies(
  denoLock: DenoLock | null,
  basePath: string,
): Promise<Package[] | null> {
  // Get all config files
  const denoConfigs = await readDenoConfig(basePath);

  // Require at least one config file, use the first
  const firstConfigFile = denoConfigs.find((configFile) => configFile.imports);
  if (!firstConfigFile) {
    return null;

    // Ready to go
  } else {
    // Download metadata for all packages
    const importsClause = firstConfigFile?.imports;
    if (importsClause) {
      const packages = Object.values(importsClause).map(async (
        entry: string,
      ) => {
        const p = new Package(entry);
        if (denoLock) p.addDenoLockfile(denoLock);
        await p.analyze();
        return p;
      });
      return await Promise.all(packages);
    } else {
      return [];
    }
  }
}
