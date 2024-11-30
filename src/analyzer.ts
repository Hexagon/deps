import { readDenoConfig } from "./configfile.ts";
import type { DenoLockGeneric } from "./lockfile.ts";
import { Package } from "./package.ts";

export async function analyzeDependencies(
  denoLock: DenoLockGeneric | null,
  basePath: string,
  preRelease: boolean,
): Promise<Package[] | null> {
  const imports = await getImportsFromConfig(basePath);

  if (!imports) {
    return null;
  }

  const packages = imports.map(async (entry: string) => {
    const p = new Package(entry);
    if (denoLock) p.addDenoLockfile(denoLock);
    await p.analyze(preRelease);
    return p;
  });

  return await Promise.all(packages);
}

async function getImportsFromConfig(
  basePath: string,
): Promise<string[] | null> {
  try {
    const denoConfigs = await readDenoConfig(basePath);
    const configWithImports = denoConfigs.find((config) => config.imports);
    if (!configWithImports || !configWithImports.imports) {
      return null; // No imports found
    }
    return Object.values(configWithImports.imports);
  } catch (e) {
    console.error("Error reading Deno configuration:", e);
    return null;
  }
}
