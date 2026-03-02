export type ScholarshipCategory =
  | "STEM"
  | "Arts"
  | "Community"
  | "Leadership"
  | "FinancialNeed";

export type ApplicationStatus =
  | "not_started"
  | "drafting"
  | "reviewing"
  | "submitted";

export interface Scholarship {
  id: string;
  title: string;
  sponsor: string;
  amount: number;
  deadline: string;
  categoryTags: ScholarshipCategory[];
  eligibilityTags: string[];
  estimatedTime: string;
  description: string;
  prompts: string[];
  /** When synced from ScholarshipOwl: external id (same as id), fields and requirements for apply. */
  source?: "scholarship_owl";
  /** Repeatable scholarship: e.g. "1 month", "1 year". meta.next = next start date. */
  recurring?: string | null;
  /** If set, scholarship is expired and no new applications accepted. */
  expiredAt?: string | null;
  /** Next run start date when recurring. */
  nextStart?: string | null;
  owlFields?: {
    id: string;
    name: string;
    type: string;
    options?: Record<string, unknown>;
    eligibilityType?: string | null;
    eligibilityValue?: string | null;
    optional?: boolean;
  }[];
  owlRequirements?: {
    id: string;
    title?: string;
    description?: string;
    optional: boolean;
    requirementType: "text" | "input" | "link" | "file" | "image";
    config?: Record<string, unknown>;
  }[];
}

export interface Application {
  id: string;
  scholarshipId: string;
  status: ApplicationStatus;
  progress: number;
  nextTask: string;
  docsRequired: string[];
  docsUploaded: string[];
  promptResponses: {
    prompt: string;
    response: string;
  }[];
}

export interface Essay {
  id: string;
  title: string;
  tags: string[];
  wordCount: number;
  updatedAt: string;
  content: string;
}

export interface ProfileSectionCompletion {
  academics: number;
  activities: number;
  awards: number;
  demographics: number;
  financial: number;
}

export interface Profile {
  academics: {
    gpa?: string;
    major?: string;
    graduationYear?: string;
  };
  activities: { id: string; name: string; role: string }[];
  awards: { id: string; name: string; year: string }[];
  demographics?: Record<string, string>;
  financial?: Record<string, string>;
}

