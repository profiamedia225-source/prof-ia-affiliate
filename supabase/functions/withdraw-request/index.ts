import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

serve(async (req) => {

  // ==========================================
  // CORS
  // ==========================================

  if (req.method === "OPTIONS") {

    return new Response("ok", {
      headers: corsHeaders,
    });

  }

  try {

    // ==========================================
    // CLIENT SUPABASE SERVICE ROLE
    // ==========================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );


    // ==========================================
    // AUTHENTIFICATION
    // ==========================================

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
      authHeader.replace(
        "Bearer ",
        "",
      );


    const {
      data: authUser,
      error: authError,
    } =
      await supabase.auth.getUser(jwt);


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


    console.log(
      "Utilisateur :",
      userId,
    );


    // ==========================================
    // RÉCUPÉRATION DES PARAMÈTRES
    // ==========================================

    const {
      amount,
      paymentMethod,
      paymentDetails,
    } = await req.json();


    const requestedAmount =
      Number(amount);


    // ==========================================
    // VALIDATION DU MONTANT
    // ==========================================

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
    // RÉCUPÉRATION DU PROFIL
    // ==========================================
    //
    // Nous récupérons les informations du
    // bénéficiaire pour préparer le futur
    // paiement SebPay :
    //
    // - fullname
    // - phone
    // - country
    //
    // ==========================================

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "fullname, phone, country",
        )
        .eq(
          "id",
          userId,
        )
        .single();


    if (
      profileError ||
      !profile
    ) {

      console.error(
        "Erreur récupération profil :",
        profileError,
      );

      return new Response(
        JSON.stringify({
          error:
            "Impossible de récupérer les informations de votre profil.",
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
    // INFORMATIONS BÉNÉFICIAIRE
    // ==========================================

    const recipientName =
      String(
        profile.fullname ??
        "",
      ).trim();


    const phone =
      String(
        profile.phone ??
        "",
      ).trim();


    const country =
      String(
        profile.country ??
        "",
      ).trim();


    // ==========================================
    // VALIDATION DU NOM
    // ==========================================

    if (!recipientName) {

      return new Response(
        JSON.stringify({
          error:
            "Votre nom complet est obligatoire pour effectuer un retrait.",
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
    // VALIDATION DU TÉLÉPHONE
    // ==========================================

    if (!phone) {

      return new Response(
        JSON.stringify({
          error:
            "Votre numéro de téléphone est obligatoire pour effectuer un retrait.",
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
    // VALIDATION DU PAYS
    // ==========================================

    if (!country) {

      return new Response(
        JSON.stringify({
          error:
            "Votre pays est obligatoire pour effectuer un retrait.",
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


    console.log(
      "Bénéficiaire :",
      recipientName,
    );

    console.log(
      "Téléphone :",
      phone,
    );

    console.log(
      "Pays :",
      country,
    );


    // ==========================================
    // RÉCUPÉRATION DES COMMISSIONS
    // ==========================================

    const {
      data: commissions,
      error: commissionError,
    } =
      await supabase
        .from("commissions")
        .select(
          "amount,status",
        )
        .eq(
          "affiliate_id",
          userId,
        );


    if (commissionError) {

      throw commissionError;

    }


    // ==========================================
    // RÉCUPÉRATION DES RETRAITS
    // ==========================================

    const {
      data: withdrawals,
      error: withdrawalError,
    } =
      await supabase
        .from("withdrawals")
        .select(
          "amount,status",
        )
        .eq(
          "affiliate_id",
          userId,
        );


    if (withdrawalError) {

      throw withdrawalError;

    }


    // ==========================================
    // CALCUL DU SOLDE DISPONIBLE
    // ==========================================

    let totalCommissions = 0;

    let totalWithdrawals = 0;


    for (
      const commission
      of commissions ?? []
    ) {

      if (
        commission.status ===
        "available"
      ) {

        totalCommissions +=
          Number(
            commission.amount,
          );

      }

    }


    for (
      const withdrawal
      of withdrawals ?? []
    ) {

      if (
        withdrawal.status ===
          "En attente" ||
        withdrawal.status ===
          "paid"
      ) {

        totalWithdrawals +=
          Number(
            withdrawal.amount,
          );

      }

    }


    const availableBalance =
      Math.max(
        0,
        totalCommissions -
          totalWithdrawals,
      );


    // ==========================================
    // VÉRIFICATION DU SOLDE
    // ==========================================

    console.log(
      "Commissions disponibles :",
      totalCommissions,
    );

    console.log(
      "Retraits :",
      totalWithdrawals,
    );

    console.log(
      "Solde disponible :",
      availableBalance,
    );

    console.log(
      "Montant demandé :",
      requestedAmount,
    );


    if (
      requestedAmount >
      availableBalance
    ) {

      return new Response(
        JSON.stringify({
          error:
            `Solde insuffisant. Votre solde disponible est de ${availableBalance} FCFA.`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );

    }


    // ==========================================
    // ENREGISTREMENT DE LA DEMANDE
    // ==========================================
    //
    // Les nouvelles informations sont maintenant
    // enregistrées directement dans withdrawals :
    //
    // recipient_name
    // phone
    // country
    //
    // Aucun paiement SebPay n'est déclenché.
    //
    // ==========================================

    const {
      data: newWithdrawal,
      error: insertError,
    } =
      await supabase
        .from("withdrawals")
        .insert({
          affiliate_id:
            userId,

          amount:
            requestedAmount,

          payment_method:
            paymentMethod,

          payment_details:
            paymentDetails,

          recipient_name:
            recipientName,

          phone:
            phone,

          country:
            country,

          status:
            "En attente",
        })
        .select(
          `
            id,
            affiliate_id,
            amount,
            payment_method,
            payment_details,
            recipient_name,
            phone,
            country,
            status,
            created_at
          `,
        )
        .single();


    if (insertError) {

      console.error(
        "Erreur création retrait :",
        insertError,
      );

      return new Response(
        JSON.stringify({
          error:
            insertError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );

    }


    // ==========================================
    // NOUVEAU SOLDE
    // ==========================================

    const newBalance =
      availableBalance -
      requestedAmount;


    console.log(
      "Nouveau solde :",
      newBalance,
    );


    // ==========================================
    // RÉPONSE
    // ==========================================

    return new Response(
      JSON.stringify({

        success:
          true,

        message:
          "Demande de retrait enregistrée avec succès.",

        availableBalance:
          newBalance,

        withdrawal:
          newWithdrawal,

      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );


  } catch (error) {

    console.error(
      "Erreur withdraw-request :",
      error,
    );


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
          "Content-Type":
            "application/json",
        },
      },
    );

  }

});