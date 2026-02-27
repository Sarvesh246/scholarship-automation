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

