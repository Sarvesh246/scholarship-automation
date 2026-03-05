/** Shape matching ExternalScholarshipItem for sync. */
export interface ScrapedScholarship {
  id?: string;
  title?: string;
  name?: string;
  sponsor?: string;
  amount?: number;
  deadline?: string;
  description?: string;
  applicationUrl?: string;
  /** Inventory tag for filtering (e.g. institutional_departmental, professional_association). */
  sourceType?: string;
}
