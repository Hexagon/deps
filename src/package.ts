import { fetchNpmPackageMeta, NpmPackageMeta } from "./npm.ts";
import { fetchJsrPackageMeta, JsrPackageMeta } from "./jsr.ts";
import { DenoLock } from "./lockfile.ts";
import { format, maxSatisfying, parse, parseRange } from "@std/semver";

/**
 * An enumeration of supported (and unsupported) package registries.
 */
export type PackageRegistry =
  | "jsr"
  | "npm"
  | "https"
  | "deno"
  | "node"
  | "bun"
  | "local";

/**
 * Represents a single external package dependency.
 */
export class Package {
  // Set by constructor
  public registry: PackageRegistry;
  public identifier: string;
  public name: string;
  public specifier: string | null;

  // Additional data
  public current: string | null = null; // set by addDenoLockfile
  public latest: string | null = null; // set by fetchInfoFromMeta
  public available: string[]; // set by fetchInfoFromMeta
  public wanted: string | null = null; // set by analyze

  /**
   * Creates a new Package instance.
   * @param identifier - The package identifier string.
   */
  constructor(identifier: string) {
    this.registry = guessRegistry(identifier);
    this.identifier = identifier;
    this.available = [];
    this.name = extractPackageName(identifier);
    this.specifier = extractVersion(identifier);
  }

  /**
   * Fetches package metadata from the relevant registry.
   * @private
   * @returns True if metadata was successfully fetched, false otherwise.
   */
  private async fetchInfoFromMeta(): Promise<boolean> {
    if (this.registry == "jsr") {
      const meta: JsrPackageMeta | null = await fetchJsrPackageMeta(this.name);
      if (meta) {
        this.latest = meta.latest;
        this.available = Object.keys(meta.versions);
        return true;
      }
    } else if (this.registry == "npm") {
      const meta: NpmPackageMeta | null = await fetchNpmPackageMeta(this.name);
      if (meta) {
        this.latest = meta["dist-tags"].latest;
        this.available = Object.keys(meta.versions);
        return true;
      }
    }
    return false;
  }

  addDenoLockfile(
    denoLock: DenoLock | null,
  ): string | null {
    if (
      denoLock?.packages?.specifiers &&
      typeof denoLock?.packages?.specifiers === "object"
    ) {
      // Filter for the matching package
      const matchingEntries = Object.entries(denoLock?.packages?.specifiers)
        .filter(([_, val]) => (val as string || "").includes(this.name));
      if (matchingEntries.length > 0) {
        this.current = extractVersion(matchingEntries[0][1]);
      }
    }
    return null;
  }

  /**
   * Fetches metadata about the package from the appropriate registry and determines the ideal
   * version to install based on the specifier.
   *
   * @returns True if the analysis was successful, false otherwise.
   */
  async analyze(): Promise<boolean> {
    if (!await this.fetchInfoFromMeta()) {
      return false;
    }

    const versions = this.available.map(parse).filter((v) => v !== null);

    if (!this.specifier) {
      this.specifier = this.latest;
    }

    if (this.specifier) {
      const latestMatching = maxSatisfying(
        versions,
        parseRange(this.specifier),
      );
      this.wanted = latestMatching ? format(latestMatching) : null;
      return true;
    }

    return false;
  }

  isOutdated(): boolean {
    return this.wanted != this.latest;
  }

  isUpToDate(): boolean {
    return this.isSupported() && !this.isOutdated();
  }

  isSupported(): boolean {
    return this.registry == "jsr" || this.registry == "npm";
  }

  isUnused(): boolean {
    return this.current ? false : true;
  }

  isBuiltIn(): boolean {
    return this.registry == "deno" || this.registry == "node" ||
      this.registry == "bun";
  }
}

/**
 * Internal helper to etermine the appropriate package registry based on the identifier.
 *
 * @param identifier - The package identifier string.
 * @returns The corresponding package registry.
 */
function guessRegistry(identifier: string): PackageRegistry {
  if (identifier.startsWith("jsr:@")) {
    return "jsr";
  } else if (identifier.startsWith("npm:")) {
    return "npm";
  } else if (identifier.startsWith("https://")) {
    return "https";
  } else if (identifier.startsWith("deno:")) {
    return "deno";
  } else if (identifier.startsWith("node:")) {
    return "node";
  } else {
    return "local";
  }
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
