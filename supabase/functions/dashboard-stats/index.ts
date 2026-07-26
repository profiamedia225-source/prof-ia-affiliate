import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {

      return new Response(
        JSON.stringify({
          error: "Utilisateur non authentifié",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );

    }

    const jwt =
      authHeader.replace("Bearer ", "");

    const {
      data: authUser,
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (
      authError ||
      !authUser.user
    ) {

      return new Response(
        JSON.stringify({
          error: "Session invalide",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );

    }

    const userId =
      authUser.user.id;

// ==========================================
// Retraits
// ==========================================

const {
  data: withdrawals,
  error: withdrawalError,
} = await supabase
  .from("withdrawals")
  .select("amount,status")
  .eq("affiliate_id", userId);

if (withdrawalError) {
  throw withdrawalError;
}

    console.log(
      "Utilisateur :",
      userId,
    );

    console.log("USER ID :", userId);

const {
  data: profile,
} = await supabase
  .from("profiles")
  .select("fullname")
  .eq("id", userId)
  .single();

console.log("PROFILE :", profile);

    // ==========================================
    // 1. Nombre de filleuls
    // ==========================================

    const {
      count: referrals
    } = await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("referred_by", userId);

    // ==========================================
    // 2. Commissions
    // ==========================================

    const {
      data: commissions,
      error: commissionError,
    } = await supabase
      .from("commissions")
      .select(
        "amount,status"
      )
      .eq(
        "affiliate_id",
        userId,
      );

    if (commissionError) {
      throw commissionError;
    }

    let availableBalance = 0;
let totalWithdrawals = 0;
let totalCommissions = 0;

for (const commission of commissions ?? []) {

  const amount = Number(commission.amount);

  totalCommissions += amount;

  if (commission.status === "available") {
    availableBalance += amount;
  }

}

    for (const withdrawal of withdrawals ?? []) {

  if (
  withdrawal.status === "En attente" ||
  withdrawal.status === "paid"
) {
    totalWithdrawals += Number(withdrawal.amount);
  }

}

availableBalance -= totalWithdrawals;

if (availableBalance < 0) {
  availableBalance = 0;
}

    // ==========================================
    // 3. Ventes
    // ==========================================

    const {
      data: orders,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(
        "amount"
      )
      .eq(
        "affiliate_id",
        userId,
      )
      .eq(
        "status",
        "paid",
      );

    if (orderError) {
      throw orderError;
    }

    const sales =
      orders?.length ?? 0;

    let revenue = 0;

    for (const order of orders ?? []) {

      revenue += Number(
        order.amount,
      );

    }

    console.log({
      referrals,
      availableBalance,
      totalCommissions,
      sales,
      revenue,
    });

console.log("COMMISSIONS :", commissions);
console.log("WITHDRAWALS :", withdrawals);
console.log("AVAILABLE :", availableBalance);

return new Response(
  JSON.stringify({
    referrals: referrals ?? 0,
    availableBalance,
    totalCommissions,
    totalWithdrawals,
    sales,
    revenue,
  }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );

  }

});