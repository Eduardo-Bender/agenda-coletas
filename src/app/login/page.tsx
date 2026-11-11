import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-slate-600">Carregando login...</main>}>
      <LoginPageContent />
    </Suspense>
  );
}

async function LoginPageContent() {
  if (await getCurrentUser()) {
    redirect("/");
  }

  return <LoginForm />;
}
