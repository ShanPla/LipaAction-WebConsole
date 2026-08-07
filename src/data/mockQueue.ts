import type { KpiSummary, QueueReport, SituationCluster, QueueTabId } from "@/types";

export const queueKpiSummary: KpiSummary = {
  fastTriageCount: 2,
  standardIntakeCount: 8,
  medianMinutes: 12,
  validatedCount: 10,
};

export const activeFloodingCluster: SituationCluster = {
  id: "CL-088",
  label: "ACTIVE FLOODING",
  category: "Flooding",
  memberCount: 7,
  barangaysAffected: ["Brgy. Tambo", "Brgy. Marawoy", "Brgy. San Guillermo"],
  identityWithheldMembers: 1,
  members: [
    {
      id: "24-2024-2314",
      category: "Flooding",
      priority: "Critical",
      summary: "Waist-deep floodwater along the creek-side footpath near the barangay hall.",
      location: "Sitio Looban, Brgy. Tambo",
      timestamp: "3m ago",
      reporter: { name: "Identity withheld", identityWithheld: true, trustScore: 0.82 },
      isClusterMember: true,
    },
    {
      id: "24-2024-2316",
      category: "Flooding",
      priority: "Critical",
      summary: "Rising water blocking the sole access road out of the sitio; two households stranded.",
      location: "Purok 4, Brgy. Marawoy",
      timestamp: "6m ago",
      reporter: { name: "Rodante Villanueva", identityWithheld: false, trustScore: 0.91 },
      isClusterMember: true,
    },
  ],
};

export const emergencyFastTriageQueue: QueueReport[] = [
  {
    id: "24-2024-2312",
    category: "Vehicular accident",
    priority: "Critical",
    summary: "Motorcycle collided with a jeepney along the highway; one rider unresponsive.",
    location: "National Highway, Brgy. Tambo",
    timestamp: "1m ago",
    reporter: { name: "Anilyn Simeona", identityWithheld: false, trustScore: 0.88 },
  },
  {
    id: "24-2024-2315",
    category: "Fire",
    priority: "Critical",
    summary: "Cooking fire spreading to an adjacent structure; occupants evacuated.",
    location: "Purok 2, Brgy. Tambo",
    timestamp: "4m ago",
    reporter: { name: "Reynaldo Ngoho", identityWithheld: false, trustScore: 0.75 },
  },
];

export const standardIntakeQueue: QueueReport[] = [
  {
    id: "24-2024-2298",
    category: "Streetlight out",
    priority: "Low",
    summary: "Streetlight outage along the covered court has been out for a week.",
    location: "Barangay covered court, Brgy. Tambo",
    timestamp: "22m ago",
    reporter: { name: "Identity withheld", identityWithheld: true, trustScore: 0.74 },
  },
  {
    id: "24-2024-2301",
    category: "Stray animal",
    priority: "Low",
    summary: "Loose dog roaming near the covered basketball court, reportedly agitated.",
    location: "Purok 3, Brgy. Tambo",
    timestamp: "31m ago",
    reporter: { name: "Elpidio Gapas", identityWithheld: false, trustScore: 0.69 },
  },
  {
    id: "24-2024-2305",
    category: "Garbage collection",
    priority: "Medium",
    summary: "Uncollected garbage accumulating near the covered market for three days.",
    location: "Public market frontage, Brgy. Tambo",
    timestamp: "48m ago",
    reporter: { name: "Marites Ubaldo", identityWithheld: false, trustScore: 0.8 },
  },
];

export const recallWindowQueue: QueueReport[] = [
  {
    id: "24-2024-2309",
    category: "Noise complaint",
    priority: "Low",
    summary: "Videoke noise past barangay curfew; reporter requests discreet follow-up.",
    location: "Purok 1, Brgy. Tambo",
    timestamp: "9m ago (recallable)",
    reporter: { name: "Identity withheld", identityWithheld: true, trustScore: 0.71 },
  },
];

export const flaggedDuplicatesQueue: QueueReport[] = [
  {
    id: "24-2024-2311",
    category: "Fire",
    priority: "Critical",
    summary: "Possible duplicate of CL-083 — same sitio, category, and time window.",
    location: "Sitio Looban, Brgy. Tambo",
    timestamp: "5m ago",
    reporter: { name: "Ignacio Cabrera", identityWithheld: false, trustScore: 0.77 },
  },
];

export const recentValidatedQueue: QueueReport[] = [
  {
    id: "24-2024-2287",
    category: "Medical emergency",
    priority: "Critical",
    summary: "Elderly resident collapsed; barangay tanod first responder confirmed and routed to CDRRMO.",
    location: "Purok 5, Brgy. Tambo",
    timestamp: "1h ago",
    reporter: { name: "Nena Amaro", identityWithheld: false, trustScore: 0.93 },
  },
];

export const queueByTab: Record<QueueTabId, QueueReport[]> = {
  emergency: emergencyFastTriageQueue,
  standard: standardIntakeQueue,
  recall: recallWindowQueue,
  duplicates: flaggedDuplicatesQueue,
  validated: recentValidatedQueue,
};

export const queueTabMeta: { id: QueueTabId; label: string; count: number }[] = [
  { id: "emergency", label: "Emergency Fast-triage", count: emergencyFastTriageQueue.length },
  { id: "standard", label: "Standard intake", count: standardIntakeQueue.length },
  { id: "recall", label: "Recall window", count: recallWindowQueue.length },
  { id: "duplicates", label: "Flagged duplicates", count: flaggedDuplicatesQueue.length },
  { id: "validated", label: "Recent validated", count: recentValidatedQueue.length },
];
