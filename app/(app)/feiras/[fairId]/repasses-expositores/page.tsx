"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

import { ExhibitorPayoutsPage } from "@/app/modules/exhibitor-payouts/components/exhibitor-payouts-page";

export default function FairExhibitorPayoutsRoutePage() {
  const params = useParams<{ fairId?: string }>();

  const fairId = useMemo(() => {
    const raw = params?.fairId;
    return Array.isArray(raw) ? raw[0] : raw ?? "";
  }, [params]);

  return <ExhibitorPayoutsPage fairId={fairId} />;
}
