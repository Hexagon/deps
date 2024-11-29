import { fetchNpmPackageMeta, type NpmPackageMeta } from "./npm.ts";
import { fetchJsrPackageMeta, type JsrPackageMeta } from "./jsr.ts";
import {
  type DenolandPackageMeta,
  fetchDenolandPackageMeta,
} from "./denoland.ts";
import type { DenoLock3, DenoPackages } from "./lockfile.ts";
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
  | "denoland"
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
    this.name = extractPackageName(this.cleanIdentifier(identifier));
    this.specifier = extractVersion(this.cleanIdentifier(identifier));
  }

  /**
   * Cleans the package identifier, specifically handling deno.land URLs.
   * @param identifier - The package identifier string.
   * @returns The cleaned package identifier.
   */
  cleanIdentifier(identifier: string): string {
    if (this.registry === "denoland") {
      try {
        const url = new URL(identifier);
        if (url.hostname === "deno.land") {
          const pathnameParts = url.pathname.split("/");
          const packageName = pathnameParts[2];
          return `${packageName}`;
        }
      } catch (_error) {
        // Ignore invalid URLs
      }
    }
    return identifier; // Return the original identifier if not deno.land
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
        this.available = filterValidVersions(Object.keys(meta.versions));
        return true;
      }
    } else if (this.registry == "npm") {
      const meta: NpmPackageMeta | null = await fetchNpmPackageMeta(this.name);
      if (meta) {
        this.latest = meta["dist-tags"].latest;
        this.available = filterValidVersions(Object.keys(meta.versions));
        return true;
      }
    } else if (this.registry == "denoland") {
      const meta: DenolandPackageMeta | null = await fetchDenolandPackageMeta(
        this.name,
      );
      if (meta) {
        this.latest = meta.latest;
        this.available = filterValidVersions(
          meta.versions as unknown as string[],
        );
        return true;
      }
    }
    return false;
  }

  /**
   * Adds information from the deno lock file (`deno.lock`)
   */
  addDenoLockfile(
    denoLock: DenoLock3 | DenoPackages | null,
  ): string | null {
    let specifiers = null;
    if (
      (denoLock as DenoLock3)?.packages?.specifiers &&
      typeof (denoLock as DenoLock3)?.packages?.specifiers === "object"
    ) {
      specifiers = (denoLock as DenoLock3)?.packages?.specifiers;
    } else if (
      (denoLock as DenoPackages)?.specifiers &&
      typeof (denoLock as DenoPackages)?.specifiers === "object"
    ) {
      specifiers = (denoLock as DenoPackages)?.specifiers;
    }
    if (
      specifiers && this.specifier !== null
    ) {
      // Filter for the matching package
      let matchingEntries = Object.entries(specifiers)
        .filter(([name, _]) =>
          (name as string || "").includes(this.specifier!)
        );
      if (matchingEntries.length === 0) {
        matchingEntries = Object.entries(specifiers)
          .filter(([name, _]) => (name as string || "").includes(this.name));
      }
      if (matchingEntries.length > 0) {
        // Sort matching entries descending by semver
        matchingEntries.sort((v1, v2) =>
          greaterThan(
              parse(v1[1]!),
              parse(v2[1]!),
            )
            ? -1
            : 1
        );
        this.current = matchingEntries[0][1];
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
      // Update latest if prereleases are requested
      if (preRelease && versions.length > 0) {
        const absolutelyLatest = versions
          .sort((v1, v2) => {
            return greaterThan(v1, v2) ? -1 : 1;
          })[0];
        this.latest = format(absolutelyLatest);
      }
      const latestMatching = maxSatisfying(
        versions,
        parseRange(this.specifier),
      );
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

  /** Checks if the current package is outdated in lockfile */
  isCurrentOutdated(): boolean {
    return this.current !== null && (this.current !== this.latest) &&
      !this.isPreRelease();
  }

  /** Checks if the current package is supported and up to date */
  isUpToDate(): boolean {
    return this.isSupported() && !this.isOutdated() &&
      !this.isCurrentOutdated();
  }

  /**
   * Checks if the registry (specifier) is supported, returns true for `jsr:` and `npm:`, false otherwise.
   */
  isSupported(): boolean {
    return this.registry == "jsr" || this.registry == "npm" ||
      this.registry == "denoland";
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
  } else if (
    identifier.startsWith("https://") && identifier.includes("deno.land")
  ) {
    return "denoland";
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

function filterValidVersions(versions: string[]): string[] {
  return versions
    .map((v) => {
      try {
        // Attempt to parse the version string
        const parsedVersion = parse(v.replaceAll(",", "."));
        return parsedVersion ? format(parsedVersion) : null; // Format if successful
      } catch (_error) {
        return null; // Ignore parsing errors
      }
    })
    .filter((v) => v !== null) as string[]; // Remove null values (failed parses)
}
