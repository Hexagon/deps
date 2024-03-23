import { default as denoJson } from "../deno.json" with { type: "json" };

export interface JsrPackageMeta {
  scope: string;
  name: string;
  latest: string;
  versions: Record<string, unknown>;
}

// Fetches package metadata from jsr.io
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
