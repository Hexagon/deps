import { join } from "@std/path";
import { tryReadJsoncFile } from "./utils.ts";
import { ImportDetails } from "./status.ts";

export interface DenoJson {
  imports?: string[];
}

export async function readDenoConfig(basePath?: string): Promise<DenoJson[]> {
  const configFilenames = ["deno.json", "deno.jsonc", "jsr.json", "jsr.jsonc"];
  const configSources: DenoJson[] = [];

  for (const filename of configFilenames) {
    const configFile: DenoJson | null = await tryReadJsoncFile(
      join(basePath || "", filename),
    );
    if (configFile && configFile?.imports) {
      configSources.push(configFile);
    }
  }

  return configSources;
}

export async function parseImportEntry(entry: string): Promise<ImportDetails> {
  const [, packageName, currentVersion] = entry.split("@");
  const [scope, name] = packageName.split("/");

  const meta = await fetchPackageMeta(scope, name);

  // Initialize with basic details
  const importDetails: ImportDetails = {
    name: `@${scope}/${name}`,
    current: currentVersion,
    specifier: currentVersion,
    latest: meta?.latest || null,
    wanted: null,
    available: meta?.available || [],
  };

  return importDetails;
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
