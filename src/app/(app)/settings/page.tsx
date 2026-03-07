import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSuppliers } from "@/lib/queries/suppliers";
import { getUserExpenses } from "@/lib/queries/expenses";
import { getUserIncomes } from "@/lib/queries/incomes";
import { getTaxSettings, getCommunityOptIn, getSaleSuccessAnimation, getPlatformFees, getDeclaredPlatforms } from "@/lib/queries/user-preferences";
import { SupplierSettings } from "@/components/settings/supplier-settings";
import { ExpenseSettings } from "@/components/settings/expense-settings";
import { IncomeSettings } from "@/components/settings/income-settings";
import { TaxSettings } from "@/components/settings/tax-settings";
import { PlatformFeesSettings } from "@/components/settings/platform-fees-settings";
import { CommunitySettings } from "@/components/settings/community-settings";
import { AnimationSettings } from "@/components/settings/animation-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [suppliers, expenses, incomesData, taxSettings, communityOptIn, saleSuccessAnimation, platformFees, declaredPlatforms] = await Promise.all([
    getUserSuppliers(session.user.id),
    getUserExpenses(session.user.id),
    getUserIncomes(session.user.id),
    getTaxSettings(session.user.id),
    getCommunityOptIn(session.user.id),
    getSaleSuccessAnimation(session.user.id),
    getPlatformFees(session.user.id),
    getDeclaredPlatforms(session.user.id),
  ]);

  return (
    <div className="py-4 space-y-6 lg:py-6 lg:space-y-8">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">Parametres</h1>
        <p className="text-sm text-muted-foreground">Fournisseurs, frais, fiscalite et preferences</p>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <div className="space-y-6">
          <SupplierSettings suppliers={suppliers} />
          <PlatformFeesSettings platformFees={platformFees} />
          <TaxSettings tvaEnabled={taxSettings.tvaEnabled} tvaRate={taxSettings.tvaRate} declaredPlatforms={declaredPlatforms} />
          <CommunitySettings communityOptIn={communityOptIn} />
          <AnimationSettings saleSuccessAnimation={saleSuccessAnimation} />
        </div>
        <div className="space-y-6">
          <IncomeSettings incomes={incomesData} />
          <ExpenseSettings expenses={expenses} />
        </div>
      </div>
    </div>
  );
}
