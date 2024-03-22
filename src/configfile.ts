import { join } from "@std/path";
import { tryReadJsoncFile } from "./utils.ts";
import { ImportDetails } from "./status.ts";
import { default as denoJson } from "../deno.json" with { type: "json" };
import { deepMerge } from "@cross/deepmerge";

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

function extractVersion(packageString: string): string | null {
  packageString = packageString.replace(":@", ":");
  packageString = packageString.includes(":")
    ? packageString.split(":")[1]
    : packageString;
  if (packageString.includes("@")) {
    const parts = packageString.split("@");
    if (parts[0] === "") {
      return null;
    } else {
      return parts.pop()!;
    }
  } else {
    return null;
  }
}

function extractPackageName(packageString: string): string {
  const hadAt = packageString.includes(":@");
  packageString = packageString.replace(":@", ":");
  packageString = packageString.includes(":")
    ? packageString.split(":")[1]
    : packageString;
  if (packageString.includes("@")) {
    const parts = packageString.split("@");
    if (parts.length === 2 || parts.length === 3) {
      return `${hadAt ? "@" : ""}${parts[0]}`;
    } else {
      return `${hadAt ? "@" : ""}${parts}`;
    }
  }
  // 3. Other cases (assumed to be treated as the full package name)
  return `${hadAt ? "@" : ""}${packageString}`;
}

export async function parseImportEntry(entry: string): Promise<ImportDetails> {
  // Scoped jsr packages
  if (entry.startsWith("jsr:@")) {
    const currentVersion = extractVersion(entry);
    const packageName = extractPackageName(entry);
    let meta = await fetchJsrPackageMeta(packageName);
    meta = deepMerge(
      meta,
      {
        registry: "jsr",
        name: packageName,
        current: currentVersion,
        specifier: currentVersion,
      } as ImportDetails,
    );
    return meta!;
  } // Npm specifier
  else if (entry.startsWith("npm:")) {
    const currentVersion = extractVersion(entry);
    const packageName = extractPackageName(entry);
    let meta = await fetchNpmPackageMeta(packageName);
    meta = deepMerge(
      meta,
      {
        registry: "npm",
        name: packageName,
        current: currentVersion,
        specifier: currentVersion,
      } as ImportDetails,
    );
    return meta!;

    // Check for https imports
  } else if (entry.startsWith("https://")) {
    return {
      registry: "https",
      name: entry.replace("https://", ""), // Treat URL as the name
      current: null,
      specifier: null,
      latest: null,
      wanted: null,
      available: [],
    };

    // 3. Check for Deno specifiers
  } else if (entry.startsWith("deno:")) {
    const currentVersion = extractVersion(entry);
    const packageName = extractPackageName(entry);
    // Deno typically manages versions through the import map
    return {
      registry: "deno",
      name: packageName,
      current: currentVersion, // Built-in, no versioning
      specifier: currentVersion,
      latest: null,
      wanted: null,
      available: [],
    };

    // 4. Check for Node.js built-ins
  } else if (entry.startsWith("node:")) {
    const currentVersion = extractVersion(entry);
    const packageName = extractPackageName(entry);
    return {
      registry: "node",
      name: packageName,
      current: currentVersion, // Built-in, no versioning
      specifier: currentVersion,
      latest: null,
      wanted: null,
      available: [],
    };

    // 5. Assume relative path
  } else {
    return {
      registry: "local",
      name: entry,
      current: null,
      specifier: entry,
      latest: null,
      wanted: null,
      available: [],
    };
  }
}

export async function fetchNpmPackageMeta(
  packageName: string,
): Promise<ImportDetails | null> {
  const registryUrl = `https://registry.npmjs.org/${packageName}`;
  try {
    const response = await fetch(registryUrl);
    if (response.ok) {
      const meta = await response.json();
      const latestVersion = meta["dist-tags"]?.latest;
      const versions = Object.keys(meta.versions || {});
      return {
        registry: "npm",
        name: packageName,
        current: null,
        specifier: null,
        latest: latestVersion,
        wanted: null,
        available: versions,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching npm metadata:", error);
    return null;
  }
}

// Fetches package metadata from jsr.io
async function fetchJsrPackageMeta(
  packageName: string,
): Promise<ImportDetails | null> {
  const url = `https://jsr.io/${packageName}/meta.json`;
  const headers = new Headers({
    "Accept": "application/json",
    "User-Agent":
      `${denoJson.name}/${denoJson.version}; https://jsr.io/${denoJson.name}`,
  });
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const meta = await response.json();
      return {
        registry: "jsr",
        name: packageName,
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
