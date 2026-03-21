"use client";

import Link from "next/link";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard } from "lucide-react";

export default function FairFinancePage() {


  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb
        items={[
          { label: "home", href: "/dashboard" },
          { label: "Financeiro" },
        ]}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Gestão financeira, recebimentos e pagamentos da feira.
        </p>
        <Separator />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="transition hover:shadow-md border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Pagamentos
              </CardTitle>
            </CardHeader>
          </Card>
      </div>
    </div>
  );
}
