import EssayEditorClient from "./EssayEditorClient";

export function generateStaticParams() {
  return [{ id: "new" }, { id: "_" }];
}

export default function EssayEditorPage() {
  return <EssayEditorClient />;
}
