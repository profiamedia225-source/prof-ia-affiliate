import { createClient } from "npm:@supabase/supabase-js@2";

// ======================================================
// CORS
// ======================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, x-sebpay-signature",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
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
// HMAC SHA-256
// ======================================================

async function generateHmacSha256(
  secret: string,
  body: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      messageData,
    );

  const bytes = new Uint8Array(signature);

  return Array
    .from(bytes)
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

// ======================================================
// COMPARAISON CONSTANT-TIME
// ======================================================

function safeEqual(
  a: string,
  b: string,
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
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
    // SECRET SEBPAY
    // ==================================================

    const secretKey =
      Deno.env.get(
        "SEBPAY_SECRET_KEY",
      );

    if (!secretKey) {
      console.error(
        "SEBPAY_SECRET_KEY absent.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Configuration webhook SebPay incomplète.",
        },
        500,
      );
    }

    // ==================================================
    // SIGNATURE SEBPAY
    // ==================================================

    const receivedSignature =
      req.headers.get(
        "X-SebPay-Signature",
      );

    if (!receivedSignature) {
      console.warn(
        "Webhook SebPay reçu sans signature.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Signature SebPay manquante.",
        },
        401,
      );
    }

    // ==================================================
    // BODY BRUT
    // ==================================================
    //
    // IMPORTANT :
    // La signature doit être calculée sur le body
    // JSON brut exactement comme reçu.
    //
    // ==================================================

    const rawBody =
      await req.text();

    if (!rawBody) {
      return jsonResponse(
        {
          success: false,
          error:
            "Body webhook vide.",
        },
        400,
      );
    }

    // ==================================================
    // CALCUL SIGNATURE
    // ==================================================

    const expectedSignature =
      await generateHmacSha256(
        secretKey,
        rawBody,
      );

    // ==================================================
    // VERIFICATION SIGNATURE
    // ==================================================

    if (
      !safeEqual(
        receivedSignature
          .trim()
          .toLowerCase(),

        expectedSignature
          .trim()
          .toLowerCase(),
      )
    ) {
      console.warn(
        "Signature SebPay invalide.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Signature SebPay invalide.",
        },
        401,
      );
    }

    console.log(
      "Signature SebPay valide.",
    );

    // ==================================================
    // PARSING JSON
    // ==================================================

    let payload: any;

    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Payload JSON invalide.",
        },
        400,
      );
    }

    // ==================================================
    // DONNEES WEBHOOK
    // ==================================================

    const transactionId =
      String(
        payload?.transaction_id ?? "",
      ).trim();

    const externalReference =
      String(
        payload?.external_reference ?? "",
      ).trim();

    const status =
      String(
        payload?.status ?? "",
      )
        .trim()
        .toLowerCase();

    const amount =
      Number(
        payload?.amount,
      );

    const currency =
      String(
        payload?.currency ?? "",
      )
        .trim()
        .toUpperCase();

    const customerPhone =
      String(
        payload?.customer_phone ?? "",
      ).trim();

    const createdAt =
      payload?.created_at ?? null;

    const updatedAt =
      payload?.updated_at ?? null;

    console.log(
      "Webhook SebPay reçu :",
      {
        transactionId,
        externalReference,
        status,
        amount,
        currency,
        customerPhone,
        createdAt,
        updatedAt,
      },
    );

    // ==================================================
    // VALIDATION TRANSACTION ID
    // ==================================================

    if (!transactionId) {
      return jsonResponse(
        {
          success: false,
          error:
            "transaction_id manquant.",
        },
        400,
      );
    }

    // ==================================================
    // VALIDATION EXTERNAL REFERENCE
    // ==================================================

    if (!externalReference) {
      return jsonResponse(
        {
          success: false,
          error:
            "external_reference manquante.",
        },
        400,
      );
    }

    // ==================================================
    // VALIDATION STATUT
    // ==================================================

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
    ];

    if (
      !allowedStatuses.includes(
        status,
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            `Statut SebPay inconnu : ${status}`,
        },
        400,
      );
    }

    // ==================================================
    // VALIDATION MONTANT
    // ==================================================

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Montant SebPay invalide.",
        },
        400,
      );
    }

    // ==================================================
    // VALIDATION DEVISE
    // ==================================================

    if (currency !== "XOF") {
      return jsonResponse(
        {
          success: false,
          error:
            `Devise SebPay non autorisée : ${currency}`,
        },
        400,
      );
    }

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
    // RECHERCHE DU RETRAIT
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
          provider,
          provider_reference,
          provider_transaction_id,
          fee,
          failure_reason,
          phone,
          country,
          updated_at
        `)
        .eq(
          "provider_reference",
          externalReference,
        )
        .maybeSingle();

    if (withdrawalError) {
      console.error(
        "Erreur recherche retrait :",
        withdrawalError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Erreur lors de la recherche du retrait.",
        },
        500,
      );
    }

    // ==================================================
    // RETRAIT INTROUVABLE
    // ==================================================

    if (!withdrawal) {
      console.warn(
        "Retrait introuvable pour :",
        externalReference,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Retrait correspondant introuvable.",
        },
        404,
      );
    }

    // ==================================================
    // VERIFICATION PROVIDER
    // ==================================================

    if (
      withdrawal.provider &&
      withdrawal.provider !== "sebpay"
    ) {
      console.warn(
        "Provider inattendu :",
        withdrawal.provider,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Ce retrait n'est pas associé à SebPay.",
        },
        409,
      );
    }

    // ==================================================
    // VERIFICATION MONTANT RETRAIT
    // ==================================================

    const withdrawalAmount =
      Number(
        withdrawal.amount,
      );

    if (
      !Number.isFinite(
        withdrawalAmount,
      ) ||
      withdrawalAmount <= 0
    ) {
      console.error(
        "Montant du retrait invalide :",
        withdrawalAmount,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Montant du retrait invalide.",
        },
        409,
      );
    }

    // ==================================================
    // PROTECTION CONTRE UN MONTANT DIFFERENT
    // ==================================================

    if (
      withdrawalAmount !== amount
    ) {
      console.error(
        "Incohérence de montant :",
        {
          withdrawalAmount,
          sebpayAmount: amount,
          withdrawalId:
            withdrawal.id,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le montant SebPay ne correspond pas au montant du retrait.",
          withdrawal_amount:
            withdrawalAmount,
          sebpay_amount:
            amount,
        },
        409,
      );
    }

    // ==================================================
    // IDEMPOTENCE
    // ==================================================
    //
    // Si cette transaction a déjà été enregistrée,
    // nous ne retraitons pas l'événement.
    //
    // ==================================================

    if (
      withdrawal.provider_transaction_id ===
      transactionId
    ) {
      console.log(
        "Webhook déjà traité :",
        transactionId,
      );

      return jsonResponse(
        {
          success: true,
          duplicate: true,
          message:
            "Webhook déjà traité.",
          withdrawal_id:
            withdrawal.id,
          transaction_id:
            transactionId,
          status:
            withdrawal.status,
        },
        200,
      );
    }

    // ==================================================
    // VERIFICATION STATUT METIER
    // ==================================================
    //
    // Un callback final ne doit normalement concerner
    // qu'un retrait actuellement en traitement.
    //
    // Cela évite qu'un ancien callback puisse modifier
    // un retrait déjà payé ou refusé.
    //
    // ==================================================

    if (
      withdrawal.status !==
      "En traitement"
    ) {
      console.warn(
        "Statut métier inattendu :",
        {
          withdrawalId:
            withdrawal.id,
          currentStatus:
            withdrawal.status,
          sebpayStatus:
            status,
        },
      );

      // On enregistre tout de même la transaction
      // pour empêcher les retries de provoquer
      // des traitements multiples.

      const {
        error:
          safeUpdateError,
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

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            withdrawal.id,
          )
          .eq(
            "provider_transaction_id",
            withdrawal.provider_transaction_id ??
              "",
          );

      if (safeUpdateError) {
        console.error(
          "Erreur enregistrement callback inattendu :",
          safeUpdateError,
        );
      }

      return jsonResponse(
        {
          success: true,
          ignored: true,
          message:
            "Webhook reçu mais retrait déjà traité ou dans un état incompatible.",
          withdrawal_id:
            withdrawal.id,
          current_status:
            withdrawal.status,
        },
        200,
      );
    }

    // ==================================================
    // TRAITEMENT PENDING
    // ==================================================
    //
    // pending = paiement SebPay encore en cours.
    //
    // Le retrait reste donc :
    //
    // En traitement
    //
    // ==================================================

    if (status === "pending") {

      const {
        data: updatedWithdrawal,
        error: updateError,
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

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            withdrawal.id,
          )
          .eq(
            "status",
            "En traitement",
          )
          .select(`
            id,
            affiliate_id,
            amount,
            status,
            provider,
            provider_reference,
            provider_transaction_id,
            fee,
            failure_reason,
            phone,
            country,
            updated_at
          `)
          .maybeSingle();

      if (updateError) {
        console.error(
          "Erreur traitement pending :",
          updateError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer le webhook pending.",
          },
          500,
        );
      }

      return jsonResponse(
        {
          success: true,
          message:
            "Webhook pending enregistré. Le retrait reste En traitement.",
          withdrawal:
            updatedWithdrawal,
        },
        200,
      );
    }

    // ==================================================
    // TRAITEMENT APPROVED
    // ==================================================
    //
    // approved = SebPay confirme le paiement.
    //
    // En traitement → paid
    //
    // ==================================================

    if (status === "approved") {

      const {
        data: updatedWithdrawal,
        error: updateError,
      } =
        await supabase
          .from("withdrawals")
          .update({
            status:
              "paid",

            provider:
              "sebpay",

            provider_reference:
              externalReference,

            provider_transaction_id:
              transactionId,

            failure_reason:
              null,

            processed_at:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            withdrawal.id,
          )
          .eq(
            "status",
            "En traitement",
          )
          .select(`
            id,
            affiliate_id,
            amount,
            status,
            provider,
            provider_reference,
            provider_transaction_id,
            fee,
            failure_reason,
            phone,
            country,
            processed_at,
            updated_at
          `)
          .maybeSingle();

      if (updateError) {
        console.error(
          "Erreur traitement approved :",
          updateError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible de valider le paiement SebPay.",
          },
          500,
        );
      }

      if (!updatedWithdrawal) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le retrait n'est plus disponible pour validation.",
          },
          409,
        );
      }

      console.log(
        "Paiement SebPay approuvé :",
        {
          withdrawalId:
            withdrawal.id,
          transactionId,
          amount,
        },
      );

      return jsonResponse(
        {
          success: true,
          message:
            "Paiement SebPay approuvé. Retrait marqué comme paid.",
          withdrawal:
            updatedWithdrawal,
        },
        200,
      );
    }

    // ==================================================
    // TRAITEMENT REJECTED
    // ==================================================
    //
    // rejected = SebPay refuse le paiement.
    //
    // En traitement → Refusé
    //
    // Le montant redevient donc disponible dans
    // le calcul du solde, conformément à la logique
    // des retraits refusés.
    //
    // ==================================================

    if (status === "rejected") {

      const rejectionReason =
        String(
          payload?.failure_reason ??
          payload?.reason ??
          payload?.message ??
          "Paiement SebPay rejeté.",
        ).trim();

      const {
        data: updatedWithdrawal,
        error: updateError,
      } =
        await supabase
          .from("withdrawals")
          .update({
            status:
              "Refusé",

            provider:
              "sebpay",

            provider_reference:
              externalReference,

            provider_transaction_id:
              transactionId,

            failure_reason:
              rejectionReason,

            processed_at:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            withdrawal.id,
          )
          .eq(
            "status",
            "En traitement",
          )
          .select(`
            id,
            affiliate_id,
            amount,
            status,
            provider,
            provider_reference,
            provider_transaction_id,
            fee,
            failure_reason,
            phone,
            country,
            processed_at,
            updated_at
          `)
          .maybeSingle();

      if (updateError) {
        console.error(
          "Erreur traitement rejected :",
          updateError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer le rejet SebPay.",
          },
          500,
        );
      }

      if (!updatedWithdrawal) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le retrait n'est plus disponible pour refus.",
          },
          409,
        );
      }

      console.log(
        "Paiement SebPay rejeté :",
        {
          withdrawalId:
            withdrawal.id,
          transactionId,
          amount,
          reason:
            rejectionReason,
        },
      );

      return jsonResponse(
        {
          success: true,
          message:
            "Paiement SebPay rejeté. Retrait marqué comme Refusé.",
          withdrawal:
            updatedWithdrawal,
        },
        200,
      );
    }

    // ==================================================
    // FALLBACK
    // ==================================================

    return jsonResponse(
      {
        success: true,
        message:
          "Webhook SebPay reçu.",
      },
      200,
    );

  } catch (error) {

    console.error(
      "Erreur sebpay-webhook :",
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