"use client";

import { createContext, useContext, ReactNode } from "react";
import { useParams } from "next/navigation";
import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query";
import { Fair } from "@/app/modules/fairs/types";
import { AlertTriangle } from "lucide-react";

type GlobalFairContextType = {
  fair: Fair | null;
  isLoading: boolean;
  isFinalizada: boolean;
};

const GlobalFairContext = createContext<GlobalFairContextType>({
  fair: null,
  isLoading: true,
  isFinalizada: false,
});

export function useGlobalFair() {
  return useContext(GlobalFairContext);
}

export function GlobalFairProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ fairId: string }>();
  // Handle fairId being string or array
  const currentFairId = Array.isArray(params?.fairId) ? params.fairId[0] : params?.fairId;

  // We fetch all fairs since the app caches it and usually we have a small number of fairs.
  const { data: fairs, isLoading } = useFairsQuery();

  const fair = fairs?.find((f: Fair) => f.id === currentFairId) || null;
  const isFinalizada = fair?.status === "FINALIZADA";

  return (
    <GlobalFairContext.Provider value={{ fair, isLoading, isFinalizada }}>
      {isFinalizada && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md w-full sticky top-0 z-50">
          <AlertTriangle className="h-4 w-4" />
          Atenção: Esta feira está FINALIZADA. Ações de edição estão suspensas.
        </div>
      )}
      {children}
    </GlobalFairContext.Provider>
  );
}
