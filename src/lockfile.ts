import { join } from "@std/path";

export interface DenoPackages {
  specifiers?: string[];
}

export interface DenoLock {
  packages?: DenoPackages;
}

export function getDenoLockPath(workingDir: string): string {
  return join(workingDir, "deno.lock");
}
