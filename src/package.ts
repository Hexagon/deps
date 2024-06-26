import { fetchNpmPackageMeta, type NpmPackageMeta } from "./npm.ts";
import { fetchJsrPackageMeta, type JsrPackageMeta } from "./jsr.ts";
import type { DenoLock } from "./lockfile.ts";
import {
  format,
  greaterThan,
  maxSatisfying,
  parse,
  parseRange,
} from "@std/semver";

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
  /** The package registry */
  public registry: PackageRegistry;
  /** The full package identifier */
  public identifier: string;
  /** The package name */
  public name: string;
  /** The package specifier (e.g. `jsr:`, `npm:`, `node:` ...) */
  public specifier: string | null;

  // Additional data
  /** set by addDenoLockfile */
  public current: string | null = null;
  /** set by fetchInfoFromMeta */
  public latest: string | null = null;
  /** set by fetchInfoFromMeta */
  public available: string[];
  /** set by analyze */
  public wanted: string | null = null;

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

  /**
   * Adds information from the deno lock file (`deno.lock`)
   */
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
        // Sort matching entries descending by semver
        matchingEntries.sort((v1, v2) =>
          greaterThan(
              parse(extractVersion(v1[1])!),
              parse(extractVersion(v2[1])!),
            )
            ? -1
            : 1
        );
        this.current = extractVersion(matchingEntries[0][1]);
      }
    }
    return null;
  }

  /**
   * Fetches metadata about the package from the appropriate registry and determines the ideal
   * version to install based on the specifier.
   *
   * @param preRelease Treat pre-releases as latest
   *
   * @returns True if the analysis was successful, false otherwise.
   */
  async analyze(preRelease: boolean): Promise<boolean> {
    if (!await this.fetchInfoFromMeta()) {
      return false;
    }

    const versions = this.available.map(parse).filter((v) => v !== null);

    if (!this.specifier) {
      this.specifier = this.latest;
    }

    if (this.specifier) {
      let latestMatching;
      if (preRelease && versions.length > 0) {
        latestMatching = versions
          .sort((v1, v2) => {
            return greaterThan(v1, v2) ? -1 : 1;
          })[0];
        this.latest = format(latestMatching);
      } else {
        latestMatching = maxSatisfying(
          versions,
          parseRange(this.specifier),
        );
      }
      this.wanted = latestMatching ? format(latestMatching) : null;
      return true;
    }

    return false;
  }

  /** Returns true if this is a pre-release later than latest */
  isPreRelease(): boolean {
    const currentOrWanted = this.current || this.wanted;
    if (!currentOrWanted || !this.latest) return false;

    const parsedCurrent = parse(currentOrWanted);
    const parsedLatest = parse(this.latest);

    if (!parsedCurrent || !parsedLatest) return false; // Handle invalid versions
    return greaterThan(parsedCurrent, parsedLatest);
  }

  /** Checks if the current package is outdated */
  isOutdated(): boolean {
    return this.wanted != this.latest && !this.isPreRelease();
  }

  /** Checks if the current package is supported and up to date */
  isUpToDate(): boolean {
    return this.isSupported() && !this.isOutdated();
  }

  /**
   * Checks if the registry (specifier) is supported, returns true for `jsr:` and `npm:`, false otherwise.
   */
  isSupported(): boolean {
    return this.registry == "jsr" || this.registry == "npm";
  }

  /**
   * Checks if the current package is unused
   */
  isUnused(): boolean {
    return this.current ? false : true;
  }

  /**
   * Check if the current package is a built in package of Deno, Node or Bun.
   */
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
