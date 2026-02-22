import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSuppliers } from "@/lib/queries/suppliers";
import { getUserExpenses } from "@/lib/queries/expenses";
import { SupplierSettings } from "@/components/settings/supplier-settings";
import { ExpenseSettings } from "@/components/settings/expense-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [suppliers, expenses] = await Promise.all([
    getUserSuppliers(session.user.id),
    getUserExpenses(session.user.id),
  ]);

  return (
    <div className="py-4 space-y-6 lg:py-6 lg:space-y-8">
      <h1 className="text-xl font-bold lg:text-2xl">Parametres</h1>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <SupplierSettings suppliers={suppliers} />
        <ExpenseSettings expenses={expenses} />
      </div>
    </div>
  );
}
