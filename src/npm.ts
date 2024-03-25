/**
 * Represents the metadata for an npm package as retrieved from the npm registry.
 */
export interface NpmPackageMeta {
  /** The name of the package. */
  name: string;
  /** Distribution tags */
  "dist-tags": {
    /** The latest stable version of the package */
    latest: string;
  };
  /** An object mapping version numbers to version metadata */
  versions: {
    [version: string]: {
      /** The package name (usually redundant) */
      name: string;
      /** The specific package version */
      version: string;
    };
  };
}

/**
 * Fetches metadata for an npm package from the npm registry.
 *
 * @param packageName - The name of the npm package.
 * @returns A Promise resolving to the package metadata or null on failure.
 */
export async function fetchNpmPackageMeta(
  packageName: string,
): Promise<NpmPackageMeta | null> {
  const registryUrl = `https://registry.npmjs.org/${packageName}`;
  try {
    const response = await fetch(registryUrl);
    if (response.ok) {
      return await response.json();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching npm metadata:", error);
    return null;
  }
}
