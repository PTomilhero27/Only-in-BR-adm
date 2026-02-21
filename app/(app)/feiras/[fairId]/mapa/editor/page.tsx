// app/(app)/feiras/[fairId]/mapa/editor/page.tsx
import { EditorClient } from "./components/editor-client";

export default async function Page({ params }: { params: Promise<{ fairId: string }> }) {
  const { fairId } = await params;
  return <EditorClient fairId={fairId} />;
}