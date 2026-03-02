/**
 * Seed script — populates the Firestore "scholarships" collection.
 *
 * Usage:
 *   1. Download your service account key from Firebase Console →
 *      Project Settings → Service Accounts → Generate new private key
 *   2. Save it as  scripts/serviceAccountKey.json  (this file is in .gitignore — never commit it)
 *   3. Run:  npx tsx scripts/seedScholarships.ts
 *
 * If the key was ever exposed (e.g. pasted in chat or committed), rotate it immediately:
 *   Firebase Console → Project Settings → Service Accounts → … → Revoke/Generate new key
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const keyPath = resolve(__dirname, "serviceAccountKey.json");
let serviceAccount: Record<string, string>;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));
} catch {
  console.error(
    "Could not find scripts/serviceAccountKey.json\n" +
      "Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key"
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

interface Scholarship {
  id: string;
  title: string;
  sponsor: string;
  amount: number;
  deadline: string;
  categoryTags: string[];
  eligibilityTags: string[];
  estimatedTime: string;
  description: string;
  prompts: string[];
}

const scholarships: Scholarship[] = [
  {
    id: "stem-innovation",
    title: "STEM Innovation Scholarship",
    sponsor: "National Science Alliance",
    amount: 10000,
    deadline: "2026-04-15",
    categoryTags: ["STEM"],
    eligibilityTags: ["Undergraduate", "3.0+ GPA", "Full-time enrollment"],
    estimatedTime: "3–4 hours",
    description:
      "Supports undergraduate students pursuing degrees in science, technology, engineering, or mathematics who demonstrate innovative thinking and academic excellence.",
    prompts: [
      "Describe a problem you'd like to solve using science or technology and your approach to tackling it.",
      "How has a specific STEM experience shaped your academic or career goals?"
    ]
  },
  {
    id: "future-leaders",
    title: "Future Leaders Grant",
    sponsor: "Leadership Tomorrow Foundation",
    amount: 5000,
    deadline: "2026-03-30",
    categoryTags: ["Leadership"],
    eligibilityTags: ["Demonstrated leadership role", "Community involvement"],
    estimatedTime: "2–3 hours",
    description:
      "Recognizes students who have taken on leadership roles in school, community organizations, or extracurricular activities and plan to continue leading.",
    prompts: [
      "Describe a time you led a group through a challenge. What did you learn about yourself?",
      "What does ethical leadership mean to you, and how do you practice it?"
    ]
  },
  {
    id: "creative-expression",
    title: "Creative Expression Arts Award",
    sponsor: "Artistry United",
    amount: 3000,
    deadline: "2026-05-01",
    categoryTags: ["Arts"],
    eligibilityTags: ["Portfolio or work samples required", "Any major"],
    estimatedTime: "2 hours",
    description:
      "Celebrates students who use visual arts, music, writing, or performance to express ideas and inspire others.",
    prompts: [
      "Tell us about a creative project that is deeply personal to you and why it matters.",
      "How do you see your art contributing to your community or field in the next five years?"
    ]
  },
  {
    id: "community-builders",
    title: "Community Builders Scholarship",
    sponsor: "Civic Engagement Network",
    amount: 7500,
    deadline: "2026-04-20",
    categoryTags: ["Community"],
    eligibilityTags: ["100+ volunteer hours", "Minimum 2.5 GPA"],
    estimatedTime: "3 hours",
    description:
      "For students who have made a sustained, measurable impact in their communities through volunteer work, advocacy, or grassroots organizing.",
    prompts: [
      "Share a community project you initiated or contributed to. What impact did it have?",
      "What systemic issue in your community would you like to address, and how would you start?"
    ]
  },
  {
    id: "first-gen-success",
    title: "First-Generation College Success Fund",
    sponsor: "Pathways to Higher Education",
    amount: 8000,
    deadline: "2026-06-01",
    categoryTags: ["FinancialNeed"],
    eligibilityTags: ["First-generation college student", "Financial need demonstrated"],
    estimatedTime: "3–4 hours",
    description:
      "Supports first-generation college students who are breaking new ground in their families by pursuing higher education despite financial barriers.",
    prompts: [
      "What does being the first in your family to attend college mean to you?",
      "Describe a challenge related to your educational journey and how you overcame it."
    ]
  },
  {
    id: "women-in-engineering",
    title: "Women in Engineering Award",
    sponsor: "TechForward Initiative",
    amount: 12000,
    deadline: "2026-05-15",
    categoryTags: ["STEM"],
    eligibilityTags: ["Women-identifying", "Engineering major", "Sophomore or above"],
    estimatedTime: "3 hours",
    description:
      "Empowers women pursuing engineering degrees by providing financial support and mentorship connections in a field where gender diversity drives innovation.",
    prompts: [
      "What drew you to engineering, and what keeps you motivated in the field?",
      "Describe a time you navigated a challenge as a woman in a male-dominated space."
    ]
  },
  {
    id: "diversity-in-tech",
    title: "Diversity in Tech Scholarship",
    sponsor: "Inclusive Innovation Labs",
    amount: 6000,
    deadline: "2026-04-10",
    categoryTags: ["STEM", "Leadership"],
    eligibilityTags: ["Underrepresented group in tech", "CS or IT major"],
    estimatedTime: "2–3 hours",
    description:
      "Aims to increase representation in the technology industry by supporting students from underrepresented backgrounds pursuing computer science or information technology degrees.",
    prompts: [
      "How does your unique background or perspective strengthen the tech industry?",
      "Describe a project or initiative where you used technology to help others."
    ]
  },
  {
    id: "environmental-stewardship",
    title: "Environmental Stewardship Grant",
    sponsor: "Green Horizons Foundation",
    amount: 4000,
    deadline: "2026-07-01",
    categoryTags: ["Community"],
    eligibilityTags: ["Environmental coursework or activism", "Any class year"],
    estimatedTime: "2 hours",
    description:
      "Supports students passionate about environmental conservation, sustainability, or climate action through academic work or hands-on community projects.",
    prompts: [
      "Describe an environmental issue you care about and what you've done to address it.",
      "How do you plan to integrate sustainability into your future career?"
    ]
  },
  {
    id: "performing-arts-fund",
    title: "Performing Arts Excellence Fund",
    sponsor: "Stage & Screen Alliance",
    amount: 5500,
    deadline: "2026-06-15",
    categoryTags: ["Arts"],
    eligibilityTags: ["Theater, dance, or music major", "Performance experience"],
    estimatedTime: "2–3 hours",
    description:
      "Recognizes exceptional talent in the performing arts — theater, dance, or music — and supports students committed to developing their craft professionally.",
    prompts: [
      "Describe a performance that was a turning point in your artistic development.",
      "How has the performing arts shaped who you are outside the stage or studio?"
    ]
  },
  {
    id: "rural-scholars",
    title: "Rural Community Scholars Program",
    sponsor: "Heartland Education Trust",
    amount: 9000,
    deadline: "2026-08-01",
    categoryTags: ["Community", "FinancialNeed"],
    eligibilityTags: ["Rural community background", "Financial need", "Any major"],
    estimatedTime: "3 hours",
    description:
      "Designed for students from rural areas who face unique barriers to higher education, including limited access to resources, mentors, and college-prep programs.",
    prompts: [
      "How has growing up in a rural community shaped your worldview and aspirations?",
      "What do you plan to give back to your hometown or similar communities after college?"
    ]
  },
  {
    id: "public-service-leadership",
    title: "Public Service Leadership Award",
    sponsor: "Citizens for Good Governance",
    amount: 7000,
    deadline: "2026-05-20",
    categoryTags: ["Leadership"],
    eligibilityTags: ["Interest in public service", "Student government or advocacy experience"],
    estimatedTime: "2–3 hours",
    description:
      "Supports students who are committed to careers in public service, government, policy, or nonprofit leadership and have demonstrated civic engagement.",
    prompts: [
      "What public policy issue are you most passionate about, and what have you done to engage with it?",
      "Describe your vision for how young leaders can improve public institutions."
    ]
  },
  {
    id: "creative-writing",
    title: "Creative Writing Excellence Award",
    sponsor: "Words That Matter Press",
    amount: 3500,
    deadline: "2026-04-25",
    categoryTags: ["Arts"],
    eligibilityTags: ["Writing sample required", "Any major"],
    estimatedTime: "2 hours",
    description:
      "Celebrates students who demonstrate exceptional skill and originality in creative writing — fiction, poetry, creative nonfiction, or screenwriting.",
    prompts: [
      "Submit a short writing sample (500–1000 words) that represents your best work.",
      "What role does writing play in your life, and how do you hope it will shape your future?"
    ]
  },
  {
    id: "minority-stem-scholars",
    title: "Minority STEM Scholars Award",
    sponsor: "Equitable Futures Foundation",
    amount: 15000,
    deadline: "2026-09-01",
    categoryTags: ["STEM"],
    eligibilityTags: ["Underrepresented minority", "STEM major", "3.2+ GPA"],
    estimatedTime: "4 hours",
    description:
      "One of the largest awards for underrepresented minority students in STEM fields, providing multi-year funding and access to research mentorship programs.",
    prompts: [
      "How has your identity influenced your journey in STEM?",
      "Describe a research question or technical challenge that excites you and why.",
      "What would you do with the mentorship and funding this award provides?"
    ]
  },
  {
    id: "social-impact-innovators",
    title: "Social Impact Innovators Scholarship",
    sponsor: "ChangeMakers Collective",
    amount: 6500,
    deadline: "2026-07-15",
    categoryTags: ["Community", "Leadership"],
    eligibilityTags: ["Social enterprise or nonprofit experience", "Any major"],
    estimatedTime: "3 hours",
    description:
      "For students who have launched or contributed to social enterprises, nonprofits, or community initiatives that create measurable positive change.",
    prompts: [
      "Tell us about a social venture or initiative you've been part of. What was the outcome?",
      "How do you plan to scale your impact in the next 3–5 years?"
    ]
  },
  {
    id: "need-based-academic",
    title: "Need-Based Academic Excellence Award",
    sponsor: "Access to Education Fund",
    amount: 10000,
    deadline: "2026-06-30",
    categoryTags: ["FinancialNeed"],
    eligibilityTags: ["Demonstrated financial need", "3.0+ GPA", "Full-time enrollment"],
    estimatedTime: "3 hours",
    description:
      "Provides substantial financial support to high-achieving students whose educational goals are at risk due to economic hardship, covering tuition, books, and living expenses.",
    prompts: [
      "Describe how financial circumstances have affected your educational journey.",
      "What are your academic and career goals, and how will this scholarship help you achieve them?"
    ]
  }
];

async function seed() {
  const batch = db.batch();
  for (const s of scholarships) {
    const { id, ...data } = s;
    batch.set(db.collection("scholarships").doc(id), data);
  }
  await batch.commit();
  console.log(`Seeded ${scholarships.length} scholarships to Firestore.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
