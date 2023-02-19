import { AppDetails, LifetimeNotification } from "decky-frontend-lib";
import { SteamClientEx, getAllNonSteamAppIds, getAppDetails } from "../steam-utils";
import { logger } from "./logger";
import { throttleAll } from "promise-throttle-all";
export * from "../steam-utils";

export function registerForGameLifetime(callback: (data: LifetimeNotification) => void): () => void {
  const { unregister } = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications(callback);
  return unregister;
}

export function getMoonDeckAppIdMark(appId: number | null): string {
  const mark = "MOONDECK_STEAM_APP_ID";
  if (appId === null) {
    return mark;
  }

  return `${mark}=${appId}`;
}

export function getAppIdFromShortcut(value: string): number | null {
  const regex = new RegExp(`(?:${getMoonDeckAppIdMark(null)}=(?<steamAppId>\\d+))`, "gi");
  const matches = value.matchAll(regex);

  let steamAppId: number | null = null;
  for (const match of matches) {
    if (match.groups != null) {
      if (match.groups.steamAppId.length > 0) {
        if (steamAppId !== null) {
          return null;
        }

        steamAppId = Number(match.groups.steamAppId);
      }
    }
  }

  return steamAppId;
}

export async function getAllMoonDeckAppDetails(): Promise<AppDetails[]> {
  try {
    const moonDeckApps: AppDetails[] = [];

    const appids = getAllNonSteamAppIds();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const tasks = appids.map((appid) => () => getAppDetails(appid));
    const allDetails = await throttleAll(100, tasks);

    for (const details of allDetails) {
      if (details?.strShortcutExe.includes("moondeckrun.sh")) {
        moonDeckApps.push(details);
      }
    }

    return moonDeckApps;
  } catch (error) {
    logger.critical(error);
    return [];
  }
}

export function isAppTypeSupported(appType: number): boolean {
  // Only steam games are supported.
  return appType === 1;
}
