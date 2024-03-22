// Interface for import details
export interface ImportDetails {
  name: string;
  current: string | null;
  specifier: string | null;
  latest: string | null;
  wanted: string | null;
  available: string[];
}

export enum UpdateStatus {
  Unknown,
  Unused,
  UpToDate,
  Outdated,
}

export function getUpdateStatus(packageDetails: ImportDetails): UpdateStatus {
  if (!packageDetails.specifier || !packageDetails.latest) {
    return UpdateStatus.Unknown;
  }
  if (packageDetails.wanted == packageDetails.latest) {
    return UpdateStatus.UpToDate;
  } else if (packageDetails.wanted != packageDetails.latest) {
    return UpdateStatus.Outdated;
  }
  return UpdateStatus.Unused;
}
