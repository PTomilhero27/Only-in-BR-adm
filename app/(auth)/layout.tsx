
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login ",
  description: "Painel administrativo",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {


  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
