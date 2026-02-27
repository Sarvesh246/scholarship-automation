import type {
  Application,
  Essay,
  Scholarship
} from "@/types";

export const scholarships: Scholarship[] = [
  {
    id: "horizon-stem",
    title: "Horizon STEM Scholars",
    sponsor: "Horizon Foundation",
    amount: 8000,
    deadline: "2026-03-15",
    categoryTags: ["STEM"],
    eligibilityTags: ["Undergraduate", "First-generation", "Full-time"],
    estimatedTime: "3–4 hours",
    description:
      "Supports first-generation students pursuing degrees in science, technology, engineering, or mathematics.",
    prompts: [
      "Describe a moment when you realized you wanted to pursue a STEM field.",
      "How will this scholarship help you contribute to your community?"
    ]
  },
  {
    id: "community-impact",
    title: "Community Impact Grant",
    sponsor: "Neighborhood Alliance",
    amount: 5000,
    deadline: "2026-03-05",
    categoryTags: ["Community", "Leadership"],
    eligibilityTags: ["Volunteer experience", "Minimum 3.0 GPA"],
    estimatedTime: "2–3 hours",
    description:
      "For students who have demonstrated a sustained commitment to improving their local communities.",
    prompts: [
      "Share a project or initiative where you created measurable impact.",
      "What does long-term community change mean to you?"
    ]
  },
  {
    id: "arts-creative-voices",
    title: "Creative Voices Arts Award",
    sponsor: "Creative Futures",
    amount: 4000,
    deadline: "2026-04-01",
    categoryTags: ["Arts"],
    eligibilityTags: ["Portfolio required"],
    estimatedTime: "2 hours",
    description:
      "Recognizes students using visual or performing arts to tell important stories.",
    prompts: [
      "Describe a piece of your work that feels especially meaningful.",
      "How do you hope your art will grow in the next few years?"
    ]
  }
];

export const applications: Application[] = [
  {
    id: "app-horizon-stem",
    scholarshipId: "horizon-stem",
    status: "drafting",
    progress: 45,
    nextTask: "Refine main essay draft",
    docsRequired: ["Transcript", "Letter of recommendation", "Resume"],
    docsUploaded: ["Transcript"],
    promptResponses: []
  },
  {
    id: "app-community-impact",
    scholarshipId: "community-impact",
    status: "reviewing",
    progress: 80,
    nextTask: "Final check before submission",
    docsRequired: ["Transcript", "Community verification letter"],
    docsUploaded: ["Transcript", "Community verification letter"],
    promptResponses: []
  },
  {
    id: "app-arts-creative-voices",
    scholarshipId: "arts-creative-voices",
    status: "not_started",
    progress: 0,
    nextTask: "Review requirements and prompts",
    docsRequired: ["Portfolio link"],
    docsUploaded: [],
    promptResponses: []
  }
];

export const essays: Essay[] = [
  {
    id: "essay-stem-journey",
    title: "Finding My Way Into STEM",
    tags: ["STEM", "Identity"],
    wordCount: 720,
    updatedAt: "2026-02-20T15:30:00.000Z",
    content:
      "I didn’t always know I wanted to study engineering. For a long time..."
  },
  {
    id: "essay-community-roots",
    title: "Growing Through Community Work",
    tags: ["Community", "Service"],
    wordCount: 540,
    updatedAt: "2026-02-22T18:10:00.000Z",
    content: "On Saturday mornings, our community center doors open at 8am..."
  },
  {
    id: "essay-creative-voice",
    title: "Why Art Is My Second Language",
    tags: ["Arts", "Storytelling"],
    wordCount: 610,
    updatedAt: "2026-02-18T10:05:00.000Z",
    content:
      "Painting has always been how I process experiences too complex for words..."
  }
];

export const deadlines = scholarships.map((scholarship) => ({
  id: scholarship.id,
  title: scholarship.title,
  scholarshipId: scholarship.id,
  deadline: scholarship.deadline,
  status: "not_started" as const
}));

