import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

// ======================================================
// PROTECTION SEBPAY
// ======================================================
//
// SEBPAY_LIVE_ENABLED doit être "true" pour autoriser
// ultérieurement les paiements réels.
//
// Pour l'instant, le secret est volontairement :
//
// SEBPAY_LIVE_ENABLED=false
//
// Donc AUCUN paiement réel ne peut être effectué.
//
// ======================================================

const LIVE_ENABLED =
  Deno.env.get("SEBPAY_LIVE_ENABLED") === "true";

// ======================================================
// MODE SIMULATION
// ======================================================
//
// Cette version reste en simulation.
//
// Même si LIVE_ENABLED était accidentellement activé,
// aucun appel réel SebPay ne sera effectué tant que
// nous n'avons pas explicitement remplacé cette logique.
//
// ======================================================

const SIMULATION_MODE = true;

// ======================================================
// STATUT ATTENDU
// ======================================================

const REQUIRED_WITHDRAWAL_STATUS =
  "En traitement";

// ======================================================
// OPERATEURS ACTUELLEMENT PRIS EN COMPTE
// ======================================================
//
// Cette liste sert uniquement à préparer les données.
// Le futur payout réel utilisera les slugs officiels
// récupérés depuis SebPay.
//
// ======================================================

const ALLOWED_OPERATORS = [
  "Wave",
  "Orange Money",
  "MTN Money",
  "Moov Money",
];

// ======================================================
// DEVISE
// ======================================================

const ALLOWED_CURRENCY = "XOF";


// ======================================================
// REPONSE JSON
// ======================================================

function jsonResponse(
  body: unknown,
  status = 200,
) {

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );

}


// ======================================================
// EDGE FUNCTION
// ======================================================

Deno.serve(async (req) => {

  // ====================================================
  // CORS
  // ====================================================

  if (req.method === "OPTIONS") {

    return new Response(
      "ok",
      {
        headers: corsHeaders,
      },
    );

  }


  // ====================================================
  // METHOD
  // ====================================================

  if (req.method !== "POST") {

    return jsonResponse(
      {
        success: false,
        error:
          "Méthode non autorisée. Utilisez POST.",
      },
      405,
    );

  }


  try {

    // ==================================================
    // CLIENT SUPABASE SERVICE ROLE
    // ==================================================

    const supabase =
      createClient(
        Deno.env.get(
          "SUPABASE_URL",
        )!,
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        )!,
      );


    // ==================================================
    // AUTHENTIFICATION
    // ==================================================

    const authHeader =
      req.headers.get(
        "Authorization",
      );


    if (!authHeader) {

      return jsonResponse(
        {
          success: false,
          error:
            "Non autorisé.",
        },
        401,
      );

    }


    const token =
      authHeader.replace(
        "Bearer ",
        "",
      );


    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase.auth.getUser(
        token,
      );


    if (
      authError ||
      !user
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Utilisateur invalide.",
        },
        401,
      );

    }


    // ==================================================
    // VERIFICATION SUPER ADMIN
    // ==================================================

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select("role")
        .eq(
          "id",
          user.id,
        )
        .single();


    if (
      profileError ||
      !profile
    ) {

      console.error(
        "Profil introuvable :",
        profileError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Profil administrateur introuvable.",
        },
        403,
      );

    }


    if (
      profile.role !==
      "super_admin"
    ) {

      console.warn(
        "Accès refusé à sebpay-payout.",
        {
          userId:
            user.id,
          role:
            profile.role,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Accès refusé. Seul un super administrateur peut effectuer cette opération.",
        },
        403,
      );

    }


    // ==================================================
    // LECTURE DU BODY
    // ==================================================

    let body: any;

    try {

      body =
        await req.json();

    } catch {

      return jsonResponse(
        {
          success: false,
          error:
            "Corps de requête JSON invalide.",
        },
        400,
      );

    }


    const withdrawalId =
      body?.withdrawalId;


    // ==================================================
    // VERIFICATION WITHDRAWAL ID
    // ==================================================

    if (
      !withdrawalId
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "withdrawalId est obligatoire.",
        },
        400,
      );

    }


    // ==================================================
    // RECUPERATION DU RETRAIT
    // ==================================================

    const {
      data: withdrawal,
      error: withdrawalError,
    } =
      await supabase
        .from("withdrawals")
        .select(`
          id,
          affiliate_id,
          amount,
          status,
          payment_method,
          payment_details,
          provider,
          provider_reference,
          provider_transaction_id,
          operator,
          phone,
          recipient_name,
          country,
          fee,
          failure_reason,
          created_at,
          requested_at,
          processed_at,
          updated_at
        `)
        .eq(
          "id",
          withdrawalId,
        )
        .single();


    if (
      withdrawalError ||
      !withdrawal
    ) {

      console.error(
        "Retrait introuvable :",
        withdrawalError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Retrait introuvable.",
        },
        404,
      );

    }


    // ==================================================
    // VERIFICATION DU STATUT
    // ==================================================

    if (
      withdrawal.status !==
      REQUIRED_WITHDRAWAL_STATUS
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            `Le retrait doit être au statut "${REQUIRED_WITHDRAWAL_STATUS}" avant de lancer le paiement.`,
          currentStatus:
            withdrawal.status,
        },
        400,
      );

    }


    // ==================================================
    // VERIFICATION DU MONTANT
    // ==================================================

    const amount =
      Number(
        withdrawal.amount,
      );


    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Montant du retrait invalide.",
        },
        400,
      );

    }


    // ==================================================
    // VERIFICATION DU MODE DE PAIEMENT
    // ==================================================

    const paymentMethod =
      String(
        withdrawal.payment_method ??
        "",
      ).trim();


    if (
      !paymentMethod
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Mode de paiement manquant.",
        },
        400,
      );

    }


    // ==================================================
    // VERIFICATION OPERATEUR
    // ==================================================

    let operator =
      String(
        withdrawal.operator ??
        "",
      ).trim();


    if (
      !operator &&
      ALLOWED_OPERATORS.includes(
        paymentMethod,
      )
    ) {

      operator =
        paymentMethod;

    }


    if (
      !operator
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Opérateur Mobile Money manquant.",
        },
        400,
      );

    }


    if (
      !ALLOWED_OPERATORS.includes(
        operator,
      )
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            `Opérateur non pris en charge : ${operator}`,
        },
        400,
      );

    }


    // ==================================================
    // VERIFICATION TELEPHONE
    // ==================================================

    const phone =
      String(
        withdrawal.phone ??
        withdrawal.payment_details ??
        "",
      ).trim();


    if (
      !phone
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Numéro Mobile Money manquant.",
        },
        400,
      );

    }


    // ==================================================
    // VERIFICATION PAYS
    // ==================================================

    const country =
      String(
        withdrawal.country ??
        "",
      ).trim()
      .toUpperCase();


    if (
      !country
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Pays du bénéficiaire manquant.",
        },
        400,
      );

    }


    // ==================================================
    // NOM BENEFICIAIRE
    // ==================================================

    let recipientName =
      String(
        withdrawal.recipient_name ??
        "",
      ).trim();


    if (
      !recipientName
    ) {

      const {
        data:
          affiliateProfile,
        error:
          affiliateProfileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "fullname",
          )
          .eq(
            "id",
            withdrawal.affiliate_id,
          )
          .maybeSingle();


      if (
        affiliateProfileError
      ) {

        console.error(
          "Erreur profil affilié :",
          affiliateProfileError,
        );

      }


      recipientName =
        String(
          affiliateProfile?.fullname ??
          "",
        ).trim();

    }


    if (
      !recipientName
    ) {

      recipientName =
        "Bénéficiaire";

    }


    // ==================================================
    // REFERENCE EXTERNE
    // ==================================================

    const externalReference =
      `PAYOUT-${withdrawal.id}`;


    // ==================================================
    // VERIFICATION REFERENCE EXISTANTE
    // ==================================================

    if (
      withdrawal.provider_reference &&
      withdrawal.provider_reference !==
        externalReference
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Une référence fournisseur différente existe déjà pour ce retrait.",
          existingReference:
            withdrawal.provider_reference,
        },
        409,
      );

    }


    // ==================================================
    // MODE SIMULATION
    // ==================================================

    if (
      SIMULATION_MODE
    ) {

      console.log(
        "==========================================",
      );

      console.log(
        "SEBPAY PAYOUT - MODE SIMULATION",
      );

      console.log(
        "AUCUN PAIEMENT REEL",
      );

      console.log(
        "LIVE_ENABLED :",
        LIVE_ENABLED,
      );

      console.log(
        "==========================================",
      );

      console.log(
        {
          withdrawalId:
            withdrawal.id,

          affiliateId:
            withdrawal.affiliate_id,

          recipientName,

          phone,

          country,

          operator,

          amount,

          currency:
            ALLOWED_CURRENCY,

          externalReference,

          paymentMethod,

        },
      );


      // ==================================================
      // ENREGISTREMENT DES DONNEES PREPAREES
      // ==================================================

      const {
        data:
          updatedWithdrawal,
        error:
          updateError,
      } =
        await supabase
          .from("withdrawals")
          .update({

            provider:
              "sebpay",

            provider_reference:
              externalReference,

            operator,

            phone,

            recipient_name:
              recipientName,

            country,

            fee:
              Number(
                withdrawal.fee ??
                0,
              ),

            updated_at:
              new Date()
                .toISOString(),

          })
          .eq(
            "id",
            withdrawal.id,
          )
          .select(`
            id,
            affiliate_id,
            amount,
            status,
            payment_method,
            payment_details,
            provider,
            provider_reference,
            provider_transaction_id,
            operator,
            phone,
            recipient_name,
            country,
            fee,
            failure_reason,
            created_at,
            requested_at,
            processed_at,
            updated_at
          `)
          .single();


      if (
        updateError
      ) {

        console.error(
          "Erreur enregistrement préparation payout :",
          updateError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer les données de préparation du paiement.",
            details:
              updateError.message,
          },
          500,
        );

      }


      // ==================================================
      // REPONSE SIMULATION
      // ==================================================

      return jsonResponse(
        {
          success: true,

          simulation:
            true,

          liveEnabled:
            LIVE_ENABLED,

          message:
            "Simulation SebPay réussie. Aucun paiement réel n'a été effectué.",

          payout: {

            withdrawalId:
              withdrawal.id,

            provider:
              "sebpay",

            status:
              "pending",

            recipientName,

            phone,

            country,

            operator,

            amount,

            currency:
              ALLOWED_CURRENCY,

            externalReference,

            fee:
              Number(
                withdrawal.fee ??
                0,
              ),

          },

          withdrawal:
            updatedWithdrawal,

        },
        200,
      );

    }


    // ==================================================
    // VERROU DE SECURITE AVANT PAIEMENT REEL
    // ==================================================
    //
    // Cette protection restera active tant que :
    //
    // SEBPAY_LIVE_ENABLED=false
    //
    // ==================================================

    if (
      !LIVE_ENABLED
    ) {

      console.warn(
        "Paiement SebPay réel bloqué par SEBPAY_LIVE_ENABLED=false.",
      );

      return jsonResponse(
        {
          success: false,

          simulation:
            false,

          liveEnabled:
            false,

          error:
            "Les paiements SebPay réels sont actuellement désactivés.",

        },
        503,
      );

    }


    // ==================================================
    // PAIEMENT REEL SEBPAY
    // ==================================================
    //
    // IMPORTANT :
    // Cette section restera volontairement désactivée
    // dans cette version.
    //
    // Nous l'implémenterons après validation complète
    // de la structure API SebPay et du webhook.
    //
    // ==================================================

    return jsonResponse(
      {
        success: false,

        simulation:
          false,

        liveEnabled:
          LIVE_ENABLED,

        error:
          "Le paiement réel SebPay n'est pas encore implémenté.",

      },
      503,
    );


  } catch (error) {

    console.error(
      "Erreur sebpay-payout :",
      error,
    );


    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur.",

      },
      500,
    );

  }

});