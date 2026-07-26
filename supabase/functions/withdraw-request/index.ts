import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const authHeader = req.headers.get("Authorization");

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

    const jwt = authHeader.replace("Bearer ", "");

    const {
      data: authUser,
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !authUser.user) {

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

    const userId = authUser.user.id;

    console.log("Utilisateur :", userId);

    const {
      amount,
      paymentMethod,
      paymentDetails,
    } = await req.json();

    const requestedAmount = Number(amount);

    if (
      !requestedAmount ||
      requestedAmount <= 0
    ) {

      return new Response(
        JSON.stringify({
          error: "Montant invalide.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );

    }

    // ==========================================
    // Récupération des commissions
    // ==========================================

    const {
      data: commissions,
      error: commissionError,
    } = await supabase
      .from("commissions")
      .select("amount,status")
      .eq("affiliate_id", userId);

    if (commissionError) {
      throw commissionError;
    }

    // ==========================================
    // Récupération des retraits
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

    // ==========================================
    // Calcul du solde disponible
    // ==========================================

    let totalCommissions = 0;
    let totalWithdrawals = 0;

    for (const commission of commissions ?? []) {

      if (commission.status === "available") {
        totalCommissions += Number(commission.amount);
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

    const availableBalance = Math.max(
      0,
      totalCommissions - totalWithdrawals,
    );
        // ==========================================
    // Vérification du solde disponible
    // ==========================================

    console.log("Commissions disponibles :", totalCommissions);
    console.log("Retraits :", totalWithdrawals);
    console.log("Solde disponible :", availableBalance);
    console.log("Montant demandé :", requestedAmount);

    if (requestedAmount > availableBalance) {

      return new Response(
        JSON.stringify({
          error:
            `Solde insuffisant. Votre solde disponible est de ${availableBalance} FCFA.`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );

    }

    // ==========================================
    // Enregistrement de la demande de retrait
    // ==========================================

    const { error: insertError } = await supabase
      .from("withdrawals")
      .insert({
        affiliate_id: userId,
        amount: requestedAmount,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        status: "En attente",
      });

    if (insertError) {

      return new Response(
        JSON.stringify({
          error: insertError.message,
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

    const newBalance =
      availableBalance - requestedAmount;

    console.log("Nouveau solde :", newBalance);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demande de retrait enregistrée avec succès.",
        availableBalance: newBalance,
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
            : "Erreur interne",
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