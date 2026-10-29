import { requireBusiness } from "@/lib/auth";
import { getOrigin } from "@/lib/origin";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export default async function ProfilePage() {
  const { user, business } = await requireBusiness();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Business profile" description="The basics visitors see at the top of your page." />
      <ProfileForm business={business} origin={await getOrigin()} slugLocked={user.is_demo} />
    </div>
  );
}
