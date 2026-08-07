import type { ValidationRecord, ValidationSummary } from "@/types";

export const validationSummary: ValidationSummary = {
  total: 72,
  confirmed: 63,
  confirmedFalse: 8,
  identityWithheld: 1,
};

export const validationRecords: ValidationRecord[] = [
  {
    reportId: "24-2024-2312",
    category: "Vehicular accident",
    tier: "Critical",
    verdict: "Confirmed",
    validatingOfficial: "Maria Lourdes R.",
    timestamp: "May 21, 14:22",
    reporter: { name: "Anilyn Simeona", identityWithheld: false, trustScore: 0.88 },
  },
  {
    reportId: "24-2024-2306",
    category: "Fire",
    tier: "Critical",
    verdict: "Confirmed",
    validatingOfficial: "Rolando C. Castillo",
    timestamp: "May 21, 13:53",
    reporter: { name: "Elgie Quirino", identityWithheld: false, trustScore: 0.81 },
  },
  {
    reportId: "24-2024-2299",
    category: "Medical emergency",
    tier: "Critical",
    verdict: "Confirmed",
    validatingOfficial: "Maria Lourdes R.",
    timestamp: "May 21, 12:41",
    reporter: { name: "Reto Amaro", identityWithheld: false, trustScore: 0.9 },
  },
  {
    reportId: "24-2024-2291",
    category: "Crime in progress",
    tier: "Critical",
    verdict: "Confirmed",
    validatingOfficial: "Rolando C. Castillo",
    timestamp: "May 20, 22:15",
    reporter: { name: "Ignacio Cabrera", identityWithheld: false, trustScore: 0.77 },
  },
  {
    reportId: "24-2024-2279",
    category: "Structural collapse",
    tier: "Standard",
    verdict: "Confirmed",
    validatingOfficial: "Maria Lourdes R.",
    timestamp: "May 20, 09:38",
    reporter: { name: "Dinesh Flores", identityWithheld: false, trustScore: 0.72 },
  },
  {
    reportId: "24-2024-2264",
    category: "Vehicular accident",
    tier: "Critical",
    verdict: "Rejected",
    validatingOfficial: "Maria Lourdes R.",
    timestamp: "May 19, 18:04",
    reporter: { name: "Federico Mantrino", identityWithheld: false, trustScore: 0.58 },
    trustDelta: "-0.08",
  },
];
