import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { demoModeEnabled } from "@/lib/db";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in · BeautyLink" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <AuthForm mode="login" demoEnabled={demoModeEnabled()} />
      </div>
      <div className="relative hidden overflow-hidden bg-accent-soft lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/amy-cover.svg" alt="" className="h-full w-full object-cover" />
      </div>
    </main>
  );
}
