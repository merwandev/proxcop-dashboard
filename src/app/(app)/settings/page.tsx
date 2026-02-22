import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSuppliers } from "@/lib/queries/suppliers";
import { SupplierSettings } from "@/components/settings/supplier-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const suppliers = await getUserSuppliers(session.user.id);

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold">Parametres</h1>

      <SupplierSettings suppliers={suppliers} />
    </div>
  );
}
