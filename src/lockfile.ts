import { join } from "@std/path";

/**
 * Represents the  packages used in a Deno project.
 */
export interface DenoLock3Packages {
  /** An array of package identifiers or locations. */
  specifiers?: string[];
}

/**
 * Represents the structure of a Deno lock file (version 3).
 */
export interface DenoLockGeneric {
  /** Information about the lock file version. */
  version: string;
}

/**
 * Represents the structure of a Deno lock file (version 3).
 */
export interface DenoLock4 {
  /** Deno lockfile version */
  version: string;
  /** Information about the project's dependencies. */
  specifiers?: string[];
}

/**
 * Represents the structure of a Deno lock file (version 3).
 */
export interface DenoLock3 {
  /** Deno lockfile version */
  version: string;
  /** Information about the project's dependencies. */
  packages?: DenoLock3Packages;
}

/**
 * Constructs the path to the 'deno.lock' file within a working directory.
 * @param workingDir - The working directory of the project
 * @returns The path to the Deno lock file.
 */
export function getDenoLockPath(workingDir: string): string {
  return join(workingDir, "deno.lock");
}
