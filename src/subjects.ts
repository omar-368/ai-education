export const subjectGroups = [
  {
    label: "General",
    subjects: [
      "General Knowledge",
      "History",
      "Geography",
      "Mathematics",
    ],
  },
  {
    label: "Veterinary",
    subjects: [
      "General Veterinary Medicine",
      "Equine Medicine",
      "Farm Animal Medicine",
      "Small Animal Medicine",
      "Pathology",
      "Parasitology",
      "Pharmacology",
      "Veterinary Anatomy",
      "Physiology",
      "Theriogenology / Reproduction",
      "Wildlife Medicine",
    ],
  },
  {
    label: "Custom",
    subjects: ["Custom Subject"],
  },
] as const;

export const subjects = subjectGroups.flatMap((group) => group.subjects);
