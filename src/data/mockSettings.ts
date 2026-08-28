import type { NotificationPreferences } from "@/types";

// currentOfficial / MockOfficialProfile removed — ProfileCard now uses the
// real, signed-in OfficialProfile from src/lib/auth.ts instead.
export const notificationPreferences: NotificationPreferences = {
  audibleAlertNewEmergency: true,
  slaBreachBrowserNotification: true,
};