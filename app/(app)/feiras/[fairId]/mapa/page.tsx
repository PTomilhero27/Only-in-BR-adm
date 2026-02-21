// app/(app)/feiras/[fairId]/mapa/page.tsx

import { FairMapPage } from "./components/fair-map-page";

/**
 * Página do Mapa da Feira
 * - Precisamos marcar como async porque no App Router
 *   params pode ser uma Promise.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ fairId: string }>;
}) {
  const { fairId } = await params;

  return <FairMapPage fairId={fairId} />;
}
