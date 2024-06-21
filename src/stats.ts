import { Package } from "./package.ts";

export interface UpdateStatistics {
  outdated: number;
  unused: number;
  upToDate: number;
  unsupported: number;
  prerelease: number;
}

export function stats(
  packages: Package[],
): UpdateStatistics {
  const statusCounts: UpdateStatistics = {
    outdated: 0,
    unused: 0,
    upToDate: 0,
    unsupported: 0,
    prerelease: 0,
  };

  packages.forEach((update) => {
    if (update.isPreRelease()) statusCounts.prerelease++;
    if (update.isOutdated()) statusCounts.outdated++;
    if (update.isUnused()) statusCounts.unused++;
    if (update.isUpToDate()) statusCounts.upToDate++;
    if (!update.isSupported()) statusCounts.unsupported++;
  });

  return statusCounts;
}
