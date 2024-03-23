export interface NpmPackageMeta {
  name: string;
  "dist-tags": {
    latest: string;
  };
  versions: {
    [version: string]: {
      name: string;
      version: string;
    };
  };
}

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
