import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AgendaClient from "./agenda-client";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="p-8 text-slate-600">Verificando sessão...</main>}>
      <ProtectedAgenda />
    </Suspense>
  );
}

async function ProtectedAgenda() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <AgendaClient accountEmail={user.email} />;
}
