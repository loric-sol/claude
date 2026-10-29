import { requireBusiness } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AppearanceForm } from "@/components/dashboard/AppearanceForm";

export default async function AppearancePage() {
  const { business } = await requireBusiness();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Appearance" description="Choose a theme and add your branding. Use “Preview page” at the top to see the result." />
      <AppearanceForm business={business} />
    </div>
  );
}
