import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

// ======================================================
// CONFIGURATION
// ======================================================

const LIVE_ENABLED =
  Deno.env.get("SEBPAY_LIVE_ENABLED") === "true";

const SEBPAY_PROXY_URL =
  Deno.env.get("SEBPAY_PROXY_URL")?.replace(/\/+$/, "");

const PROXY_SHARED_SECRET =
  Deno.env.get("PROXY_SHARED_SECRET");

const REQUIRED_WITHDRAWAL_STATUS =
  "En traitement";

const ALLOWED_CURRENCY =
  "XOF";

// ======================================================
// OPERATEURS
// ======================================================
//
// Les utilisateurs peuvent avoir enregistré le nom
// commercial dans withdrawals.operator/payment_method.
//
// SebPay attend le slug opérateur.
// Les slugs utilisés ici correspondent aux opérateurs
// CI précédemment récupérés depuis SebPay.
//

const OPERATOR_MAP: Record<string, string> = {
  "Wave": "wave-ci",
  "Wave Money": "wave-ci",
  "wave": "wave-ci",
  "wave-ci": "wave-ci",

  "Orange Money": "orange-ci",
  "Orange": "orange-ci",
  "orange": "orange-ci",
  "orange-ci": "orange-ci",

  "MTN Money": "mtn-ci",
  "MTN": "mtn-ci",
  "mtn": "mtn-ci",
  "mtn-ci": "mtn-ci",

  "Moov Money": "moov-ci",
  "Moov": "moov-ci",
  "moov": "moov-ci",
  "moov-ci": "moov-ci",
};

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
        "Content-Type": "application/json",
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
    // VERIFICATION CONFIGURATION PROXY
    // ==================================================

    if (!SEBPAY_PROXY_URL) {
      console.error(
        "SEBPAY_PROXY_URL n'est pas configuré.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le proxy SebPay n'est pas configuré.",
        },
        500,
      );
    }

    if (!PROXY_SHARED_SECRET) {
      console.error(
        "PROXY_SHARED_SECRET n'est pas configuré.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le secret de communication avec le proxy n'est pas configuré.",
        },
        500,
      );
    }

    // ==================================================
    // CLIENT SUPABASE SERVICE ROLE
    // ==================================================

    const supabase =
      createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

    // ==================================================
    // AUTHENTIFICATION
    // ==================================================

    const authHeader =
      req.headers.get("Authorization");

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

    if (!withdrawalId) {
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
      !Number.isFinite(amount) ||
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
        withdrawal.payment_method ?? "",
      ).trim();

    if (!paymentMethod) {
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
    // OPERATEUR
    // ==================================================

    let operatorInput =
      String(
        withdrawal.operator ?? "",
      ).trim();

    if (!operatorInput) {
      operatorInput =
        paymentMethod;
    }

    const operator =
      OPERATOR_MAP[operatorInput];

    if (!operator) {
      return jsonResponse(
        {
          success: false,
          error:
            `Opérateur Mobile Money non pris en charge : ${operatorInput}`,
          supportedOperators: [
            "Wave",
            "Orange Money",
            "MTN Money",
            "Moov Money",
          ],
        },
        400,
      );
    }

    // ==================================================
    // TELEPHONE
    // ==================================================

    const phone =
      String(
        withdrawal.phone ??
        withdrawal.payment_details ??
        "",
      ).trim();

    if (!phone) {
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
    // PAYS
    // ==================================================

    const country =
      String(
        withdrawal.country ?? "",
      )
        .trim()
        .toUpperCase();

    if (!country) {
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
        withdrawal.recipient_name ?? "",
      ).trim();

    if (!recipientName) {

      const {
        data:
          affiliateProfile,
        error:
          affiliateProfileError,
      } =
        await supabase
          .from("profiles")
          .select("fullname")
          .eq(
            "id",
            withdrawal.affiliate_id,
          )
          .maybeSingle();

      if (affiliateProfileError) {
        console.error(
          "Erreur profil affilié :",
          affiliateProfileError,
        );
      }

      recipientName =
        String(
          affiliateProfile?.fullname ?? "",
        ).trim();
    }

    if (!recipientName) {
      recipientName =
        "Bénéficiaire";
    }

    // ==================================================
    // REFERENCE EXTERNE
    // ==================================================

    const externalReference =
      `PAYOUT-${withdrawal.id}`;

    // ==================================================
    // PROTECTION REFERENCE
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
    // DONNEES ENVOYEES AU PROXY AWS
    // ==================================================

    const payoutPayload = {
      withdrawal_id:
        withdrawal.id,

      recipient_name:
        recipientName,

      phone,

      operator,

      country,

      amount,

      currency:
        ALLOWED_CURRENCY,

      external_reference:
        externalReference,
    };

    console.log(
      "==========================================",
    );

    console.log(
      "SEBPAY PAYOUT → PROXY AWS",
    );

    console.log(
      "LIVE_ENABLED :",
      LIVE_ENABLED,
    );

    console.log(
      "Proxy URL :",
      SEBPAY_PROXY_URL,
    );

    console.log(
      {
        withdrawalId:
          withdrawal.id,
        recipientName,
        phone,
        operator,
        country,
        amount,
        currency:
          ALLOWED_CURRENCY,
        externalReference,
      },
    );

    console.log(
      "==========================================",
    );

    // ==================================================
    // APPEL AWS
    // ==================================================

    let proxyResponse: Response;

    try {

      proxyResponse =
        await fetch(
          `${SEBPAY_PROXY_URL}/payout`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-proxy-secret":
                PROXY_SHARED_SECRET,
            },

            body:
              JSON.stringify(
                payoutPayload,
              ),
          },
        );

    } catch (proxyError) {

      console.error(
        "Erreur connexion proxy AWS :",
        proxyError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de contacter le proxy AWS SebPay.",
        },
        502,
      );
    }

    // ==================================================
    // LECTURE REPONSE AWS
    // ==================================================

    let proxyData: any;

    try {

      proxyData =
        await proxyResponse.json();

    } catch {

      console.error(
        "Réponse AWS non JSON.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le proxy AWS a retourné une réponse invalide.",
          proxyStatus:
            proxyResponse.status,
        },
        502,
      );
    }

    console.log(
      "Réponse proxy AWS :",
      proxyData,
    );

    // ==================================================
    // ECHEC AWS / SEBPAY
    // ==================================================

    if (
      !proxyResponse.ok ||
      proxyData?.success !== true
    ) {

      console.error(
        "Payout refusé par le proxy :",
        {
          status:
            proxyResponse.status,
          response:
            proxyData,
        },
      );

      return jsonResponse(
        {
          success: false,

          error:
            proxyData?.error ??
            proxyData?.message ??
            "Le proxy AWS a refusé le payout.",

          proxyStatus:
            proxyResponse.status,

          proxyResponse:
            proxyData,
        },
        502,
      );
    }

    // ==================================================
    // RESULTAT SIMULATION
    // ==================================================

    if (
      proxyData?.simulation === true
    ) {

      const transactionId =
        proxyData?.payout?.transaction_id ??
        null;

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

            provider_transaction_id:
              transactionId,

            operator,

            phone,

            recipient_name:
              recipientName,

            country,

            fee:
              Number(
                withdrawal.fee ?? 0,
              ),

            updated_at:
              new Date().toISOString(),
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

      if (updateError) {

        console.error(
          "Erreur mise à jour retrait :",
          updateError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Le payout a été simulé, mais l'enregistrement du retrait a échoué.",
            details:
              updateError.message,
          },
          500,
        );
      }

      return jsonResponse(
        {
          success: true,

          simulation:
            true,

          liveEnabled:
            LIVE_ENABLED,

          message:
            "Connexion Supabase → AWS → SebPay réussie en simulation. Aucun paiement réel n'a été effectué.",

          payout:
            proxyData.payout,

          withdrawal:
            updatedWithdrawal,
        },
        200,
      );
    }

    // ==================================================
    // RESULTAT PAYOUT REEL
    // ==================================================
    //
    // Le proxy SebPay retourne normalement "pending".
    // Le statut final sera traité par le webhook SebPay.
    //
    // IMPORTANT :
    // Nous ne marquons PAS le retrait "paid" ici.
    //

    const transactionId =
      proxyData?.payout?.transaction_id ??
      null;

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

          provider_transaction_id:
            transactionId,

          operator,

          phone,

          recipient_name:
            recipientName,

          country,

          fee:
            Number(
              withdrawal.fee ?? 0,
            ),

          updated_at:
            new Date().toISOString(),
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

    if (updateError) {

      console.error(
        "Erreur mise à jour retrait après payout :",
        updateError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le payout a été envoyé mais l'enregistrement du retrait a échoué.",
          details:
            updateError.message,
        },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,

        simulation:
          false,

        liveEnabled:
          LIVE_ENABLED,

        message:
          "Payout SebPay envoyé. Le statut final sera confirmé par le webhook SebPay.",

        payout:
          proxyData.payout,

        withdrawal:
          updatedWithdrawal,
      },
      200,
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