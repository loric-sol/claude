import { requireBusiness } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LinksForm } from "@/components/dashboard/LinksForm";

export default async function LinksPage() {
  const { business } = await requireBusiness();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Booking & links" description="Where your buttons send people. BeautyLink doesn't take bookings — it sends visitors to the booking system you already use." />
      <LinksForm business={business} />
    </div>
  );
}
