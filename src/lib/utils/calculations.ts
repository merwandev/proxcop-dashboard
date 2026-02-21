export interface ProfitInput {
  salePrice: number;
  purchasePrice: number;
  platformFee: number;
  shippingCost: number;
  otherFees: number;
  cashbackReceived: number;
}

export function calculateNetProfit(input: ProfitInput): number {
  return (
    input.salePrice -
    input.purchasePrice -
    input.platformFee -
    input.shippingCost -
    input.otherFees +
    input.cashbackReceived
  );
}

export function calculateROI(netProfit: number, purchasePrice: number): number {
  if (purchasePrice === 0) return 0;
  return (netProfit / purchasePrice) * 100;
}

export function calculateMargin(netProfit: number, salePrice: number): number {
  if (salePrice === 0) return 0;
  return (netProfit / salePrice) * 100;
}
