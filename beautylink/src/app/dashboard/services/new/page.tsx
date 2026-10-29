import { requireBusiness } from "@/lib/auth";
import { contactFallback } from "@/lib/booking";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ServiceForm } from "@/components/dashboard/ServiceForm";

export default async function NewService() {
  const { business } = await requireBusiness();
  const fallback = contactFallback(business);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add a service" description="Name, price, duration and where clients should book it." />
      <ServiceForm service={null} generalBookingUrl={business.general_booking_url} fallbackLabel={fallback?.kind === "contact" ? fallback.label : null} />
    </div>
  );
}
