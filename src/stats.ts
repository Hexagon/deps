import { getUpdateStatus, ImportDetails, UpdateStatus } from "./status.ts";

export interface UpdateStatistics {
  outdated: number;
  unused: number;
  upToDate: number;
}

export function stats(
  updates: ImportDetails[],
  ignoreUnused: boolean,
): UpdateStatistics {
  const statusCounts: UpdateStatistics = {
    outdated: 0,
    unused: 0,
    upToDate: 0,
  };

  updates?.forEach((update) => {
    switch (getUpdateStatus(update, ignoreUnused)) {
      case UpdateStatus.Outdated:
        statusCounts.outdated++;
        break;
      case UpdateStatus.Unused:
        statusCounts.unused++;
        break;
      case UpdateStatus.UpToDate:
        statusCounts.upToDate++;
        break;
    }
  });

  return statusCounts;
}
