import { join } from "@std/path";
import { tryReadJsoncFile } from "./utils.ts";

export interface DenoJson {
  name?: string;
  version?: string;
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
