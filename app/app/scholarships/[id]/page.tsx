import ScholarshipDetailClient from "./ScholarshipDetailClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ScholarshipDetailPage() {
  return <ScholarshipDetailClient />;
}
