import { join } from "@std/path";
import { ImportDetails } from "./status.ts";

export interface DenoPackages {
  specifiers?: string[];
}

export interface DenoLock {
  packages?: DenoPackages;
}

export function getDenoLockPath(workingDir: string) {
  return join(workingDir, "deno.lock");
}
export function extractVersionFromLock(
  denoLock: DenoLock | null,
  packageDetails: ImportDetails,
): string | null {
  if (
    denoLock?.packages?.specifiers &&
    typeof denoLock?.packages?.specifiers === "object"
  ) {
    // Filter for the matching package
    const matchingEntries = Object.entries(denoLock?.packages?.specifiers)
      .filter(([_, val]) =>
        (val as string || "").includes(packageDetails.name)
      );
    if (matchingEntries.length > 0) {
      const [, , version] = (matchingEntries[0][1] as string).split("@"); // Extract from the first match
      return version;
    }
  }
  return null;
}
