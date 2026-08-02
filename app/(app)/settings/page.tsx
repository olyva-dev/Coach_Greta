import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { NotificationsPanel } from "@/components/settings/notifications-panel";
import { MfaPanel } from "@/components/settings/mfa-panel";
import { AccountPanel } from "@/components/settings/account-panel";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("*").single(),
    supabase
      .from("push_subscriptions")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (!user || !profile) return null;

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <NotificationsPanel subscriptions={subscriptions ?? []} />
      <ProfileForm profile={profile} />
      <MfaPanel />
      <AccountPanel email={user.email ?? ""} />
    </div>
  );
}
