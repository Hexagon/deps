// Interface for import details
export interface ImportDetails {
  registry: "jsr" | "npm" | "https" | "deno" | "node" | "bun" | "local";
  name: string;
  current: string | null;
  specifier: string | null;
  latest: string | null;
  wanted: string | null;
  available: string[];
}

export enum UpdateStatus {
  Unused,
  UpToDate,
  Outdated,
  Unsupported,
  BuiltIn,
}

export function getUpdateStatus(
  packageDetails: ImportDetails,
  ignoreUnused: boolean,
): UpdateStatus {
  if (
    packageDetails.registry == "local" || packageDetails.registry == "https"
  ) {
    return UpdateStatus.Unsupported;
  } else if (
    packageDetails.registry == "node" || packageDetails.registry == "deno" ||
    packageDetails.registry == "bun"
  ) {
    return UpdateStatus.BuiltIn;
  } else if (!packageDetails.specifier || !packageDetails.latest) {
    return UpdateStatus.Unsupported;
  } else if (!packageDetails.current && !ignoreUnused) {
    return UpdateStatus.Unused;
  } else if (packageDetails.wanted == packageDetails.latest) {
    return UpdateStatus.UpToDate;
  } else if (packageDetails.wanted != packageDetails.latest) {
    return UpdateStatus.Outdated;
  } else {
    return UpdateStatus.Unsupported;
  }
}
