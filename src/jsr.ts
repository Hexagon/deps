import { default as denoJson } from "../deno.json" with { type: "json" };

/**
 * Represents package metadata retrieved from jsr.io
 */
export interface JsrPackageMeta {
  /** The package's scope or namespace on jsr.io */
  scope: string;
  /** The package's name */
  name: string;
  /** The latest available version of the package */
  latest: string;
  /** A map of available versions and their metadata */
  versions: Record<string, unknown>;
}

/**
 * Fetches package metadata from the jsr.io service.
 *
 * @param packageName - The name of the package to fetch metadata for.
 * @returns A Promise resolving to the package metadata or null if the package is not found.
 */
export async function fetchJsrPackageMeta(
  packageName: string,
): Promise<JsrPackageMeta | null> {
  const url = `https://jsr.io/${packageName}/meta.json`;
  const headers = new Headers({
    "Accept": "application/json",
    "User-Agent":
      `${denoJson.name}/${denoJson.version}; https://jsr.io/${denoJson.name}`,
  });
  const response = await fetch(url, { headers });
  if (response.ok) {
    return await response.json();
  } else {
    return null;
  }
}
