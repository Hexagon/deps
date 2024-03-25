import { join } from "@std/path";

/**
 * Represents the  packages used in a Deno project.
 */
export interface DenoPackages {
  /** An array of package identifiers or locations. */
  specifiers?: string[];
}

/**
 * Represents the structure of a Deno lock file.
 */
export interface DenoLock {
  /** Information about the project's dependencies. */
  packages?: DenoPackages;
}

/**
 * Constructs the path to the 'deno.lock' file within a working directory.
 * @param workingDir - The working directory of the project
 * @returns The path to the Deno lock file.
 */
export function getDenoLockPath(workingDir: string): string {
  return join(workingDir, "deno.lock");
}
