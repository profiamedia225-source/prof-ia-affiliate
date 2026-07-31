import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function getAffiliateStats(
  supabase: SupabaseClient,
  affiliateId: string
) {

  // ==========================
  // COMMISSIONS
  // ==========================

  const { data: commissions, error: commissionError } =
    await supabase
      .from("commissions")
      .select("amount,status")
      .eq("affiliate_id", affiliateId);

  if (commissionError) throw commissionError;

  let totalCommissions = 0;
  let availableBalance = 0;

  for (const commission of commissions ?? []) {

    const amount = Number(commission.amount);

    totalCommissions += amount;

    if (commission.status === "available") {
      availableBalance += amount;
    }
  }

  // ==========================
  // RETRAITS
  // ==========================

  const { data: withdrawals, error: withdrawalError } =
    await supabase
      .from("withdrawals")
      .select("amount,status")
      .eq("affiliate_id", affiliateId);

  if (withdrawalError) throw withdrawalError;

  let pendingWithdrawals = 0;
  let totalWithdrawals = 0;

  for (const withdrawal of withdrawals ?? []) {

    const amount = Number(withdrawal.amount);

    if (withdrawal.status === "En attente") {

      pendingWithdrawals += amount;
      totalWithdrawals += amount;

    }

    if (withdrawal.status === "paid") {

      totalWithdrawals += amount;

    }

  }

  availableBalance -= totalWithdrawals;

  if (availableBalance < 0) {

    availableBalance = 0;

  }

  // ==========================
  // VENTES
  // ==========================

  const { data: orders, error: orderError } =
    await supabase
      .from("orders")
      .select("amount")
      .eq("affiliate_id", affiliateId)
      .eq("status", "paid");

  if (orderError) throw orderError;

  const sales = orders?.length ?? 0;

  let revenue = 0;

  for (const order of orders ?? []) {

    revenue += Number(order.amount);

  }

  // ==========================
  // FILLEULS
  // ==========================

  const { count: referrals } =
    await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("referred_by", affiliateId);

  return {

    referrals: referrals ?? 0,

    availableBalance,

    totalCommissions,

    pendingWithdrawals,

    totalWithdrawals,

    sales,

    revenue

  };

}