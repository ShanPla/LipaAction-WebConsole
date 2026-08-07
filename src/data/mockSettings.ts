import type { NotificationPreferences, OfficialProfile } from "@/types";

export const currentOfficial: OfficialProfile = {
  name: "Maria Lourdes R.",
  role: "Barangay Secretary",
  barangay: "Brgy. Tambo",
  city: "Lipa City, Batangas",
  email: "m*****@lipa.gov.ph",
  phone: "+63 9** *** **20",
  mfaEnabled: true,
  roleGrantedBy: "Punong Barangay Reynaldo C. Ilagan",
  roleGrantedDate: "Sept 12, 2025",
};

export const notificationPreferences: NotificationPreferences = {
  audibleAlertNewEmergency: true,
  slaBreachBrowserNotification: true,
};
