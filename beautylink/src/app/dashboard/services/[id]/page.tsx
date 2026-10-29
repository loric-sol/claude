import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { contactFallback } from "@/lib/booking";
import { getService } from "@/lib/repo";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ServiceForm } from "@/components/dashboard/ServiceForm";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const service = getService(business.id, (await params).id);
  if (!service) notFound();
  const fallback = contactFallback(business);
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${service.name}`} description="Changes appear on your public page as soon as you save." />
      <ServiceForm service={service} generalBookingUrl={business.general_booking_url} fallbackLabel={fallback?.kind === "contact" ? fallback.label : null} />
    </div>
  );
}
