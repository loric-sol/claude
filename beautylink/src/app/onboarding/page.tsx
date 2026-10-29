import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { getOrigin } from "@/lib/origin";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up your page · BeautyLink" };

export default async function Onboarding() {
  const { business } = await getCurrentBusiness();
  if (business) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-start justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow">Step 1 of 3</p>
        <h1 className="mt-2 font-display text-4xl">Let’s set up your page</h1>
        <p className="mt-2 text-sm text-muted">Just the basics — you’ll add services, photos and links next.</p>
        <OnboardingForm origin={await getOrigin()} />
      </div>
    </main>
  );
}
