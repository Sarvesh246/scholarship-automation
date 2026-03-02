import ApplicationWorkspaceClient from "./ApplicationWorkspaceClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ApplicationWorkspacePage() {
  return <ApplicationWorkspaceClient />;
}
