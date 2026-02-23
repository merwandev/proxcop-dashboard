import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserCashbacks, getCashbackSummary } from "@/lib/queries/cashback";
import { CashbackPageClient } from "@/components/cashback/cashback-page-client";

export default async function CashbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [cashbacks, summary] = await Promise.all([
    getUserCashbacks(session.user.id),
    getCashbackSummary(session.user.id),
  ]);

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">Cashback</h1>
        <p className="text-sm text-muted-foreground">
          Suivi de vos cashbacks sur toutes vos paires
        </p>
      </div>

      <CashbackPageClient
        cashbacks={cashbacks.map((c) => ({
          id: c.id,
          amount: c.amount,
          source: c.source,
          status: c.status,
          requestedAt: c.requestedAt.toISOString(),
          receivedAt: c.receivedAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
          variantId: c.variantId,
          productName: c.productName,
          productImage: c.productImage,
          productSku: c.productSku,
          sizeVariant: c.sizeVariant,
        }))}
        summary={{
          totalReceived: Number(summary.totalReceived),
          totalPending: Number(summary.totalPending),
          countTotal: summary.countTotal,
          countToRequest: summary.countToRequest,
          countRequested: summary.countRequested,
          countApproved: summary.countApproved,
          countReceived: summary.countReceived,
        }}
      />
    </div>
  );
}
