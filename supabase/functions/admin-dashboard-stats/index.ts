import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===========================
    // PROFILS
    // ===========================

    const {
      count: totalProfiles
    } = await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      });

    // ===========================
    // COMMANDES PAYÉES
    // ===========================

    const {
      data: paidOrders
    } = await supabase
      .from("orders")
      .select("amount")
      .eq("status", "paid");

    const totalOrders =
      paidOrders?.length ?? 0;

    const totalRevenue =
      paidOrders?.reduce(
        (sum, order) =>
          sum + Number(order.amount),
        0
      ) ?? 0;

    // ===========================
    // COMMISSIONS
    // ===========================

    const {
      data: commissions
    } = await supabase
      .from("commissions")
      .select("amount")
      .eq("status", "available");

    const totalCommissions =
      commissions?.reduce(
        (sum, commission) =>
          sum + Number(commission.amount),
        0
      ) ?? 0;

      // ===========================
// CLICS
// ===========================

const {
  count: totalClicks
} = await supabase
  .from("clicks")
  .select("*", {
    count: "exact",
    head: true,
  });

  // ===========================
// PRODUITS
// ===========================

const {
  count: totalProducts
} = await supabase
  .from("products")
  .select("*", {
    count: "exact",
    head: true,
  });

  // ===========================
// NOTIFICATIONS
// ===========================

const {
  count: unreadNotifications
} = await supabase
  .from("notifications")
  .select("*", {
    count: "exact",
    head: true,
  })
  .eq("is_read", false);

    // ===========================
    // RETRAITS
    // ===========================

    const {
      count: pendingWithdrawals
    } = await supabase
      .from("withdrawals")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "En attente");

    const {
      count: paidWithdrawals
    } = await supabase
      .from("withdrawals")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "paid");

    const {
      count: rejectedWithdrawals
    } = await supabase
      .from("withdrawals")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "Refusé");

    // ===========================
    // RÉPONSE
    // ===========================

    return new Response(

      JSON.stringify({

        totalProfiles,

        totalOrders,

        totalRevenue,

        totalCommissions,

        pendingWithdrawals,

        paidWithdrawals,

        rejectedWithdrawals,

        totalClicks,

        totalProducts,

        unreadNotifications,

      }),

      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }

    );

  } catch (error) {

    return new Response(

      JSON.stringify({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur interne",

      }),

      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }

    );

  }

});