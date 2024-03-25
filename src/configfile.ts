import { join } from "@std/path";
import { tryReadJsoncFile } from "./utils.ts";

/**
 * Describes the structure of a Deno configuration object.
 */
export interface DenoJson {
  /** The name of the Deno project. */
  name?: string;
  /** The version of the Deno project. */
  version?: string;
  /** An array of paths to modules or configuration files. */
  imports?: string[];
}

/**
 * Reads Deno configuration files (deno.json, deno.jsonc, etc.) from a specified base directory.
 *
 * @param [basePath] - The base directory to search for configuration files.
 * @returns A Promise resolving to an array of parsed Deno configuration objects.
 */
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
