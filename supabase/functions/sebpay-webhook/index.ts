import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, x-sebpay-signature",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


// ======================================================
// CONFIGURATION
// ======================================================

const WEBHOOK_TEST_MODE = true;


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
// HMAC SHA-256
// ======================================================

async function generateHmacSha256(
  secret: string,
  body: string,
): Promise<string> {

  const encoder =
    new TextEncoder();

  const keyData =
    encoder.encode(secret);

  const messageData =
    encoder.encode(body);


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


  const bytes =
    new Uint8Array(
      signature,
    );


  return Array
    .from(bytes)
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
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

  if (
    a.length !==
    b.length
  ) {

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

  if (
    req.method ===
    "OPTIONS"
  ) {

    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      },
    );

  }


  // ====================================================
  // METHOD
  // ====================================================

  if (
    req.method !==
    "POST"
  ) {

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


    if (
      !secretKey
    ) {

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
    // SIGNATURE
    // ==================================================

    const receivedSignature =
      req.headers.get(
        "X-SebPay-Signature",
      );


    if (
      !receivedSignature
    ) {

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
    // LECTURE DU BODY BRUT
    // ==================================================
    //
    // IMPORTANT :
    // La signature HMAC doit être calculée sur
    // le body JSON brut reçu.
    //
    // Ne pas faire req.json() avant cette étape.
    //
    // ==================================================

    const rawBody =
      await req.text();


    if (
      !rawBody
    ) {

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
        JSON.parse(
          rawBody,
        );

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
        payload?.transaction_id ??
        "",
      ).trim();


    const externalReference =
      String(
        payload?.external_reference ??
        "",
      ).trim();


    const status =
      String(
        payload?.status ??
        "",
      ).trim()
      .toLowerCase();


    const amount =
      Number(
        payload?.amount,
      );


    const currency =
      String(
        payload?.currency ??
        "",
      ).trim();


    const customerPhone =
      String(
        payload?.customer_phone ??
        "",
      ).trim();


    const createdAt =
      payload?.created_at ??
      null;


    const updatedAt =
      payload?.updated_at ??
      null;


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

    if (
      !transactionId
    ) {

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

    if (
      !externalReference
    ) {

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


    if (
      withdrawalError
    ) {

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


    if (
      !withdrawal
    ) {

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
    // IDEMPOTENCE
    // ==================================================
    //
    // Si le même transaction_id a déjà été enregistré,
    // le webhook est probablement un retry.
    //
    // Nous ne retraitons donc pas l'événement.
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
        },
        200,
      );

    }


    // ==================================================
    // VERIFICATION DE COHERENCE
    // ==================================================

    if (
      withdrawal.provider &&
      withdrawal.provider !==
        "sebpay"
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
    // MODE TEST SECURISE
    // ==================================================
    //
    // Nous enregistrons la transaction SebPay mais
    // nous NE changeons PAS encore le statut métier
    // du retrait.
    //
    // Cela nous permet de tester le webhook sans
    // modifier le solde disponible.
    //
    // ==================================================

    if (
      WEBHOOK_TEST_MODE
    ) {

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
            provider,
            provider_reference,
            provider_transaction_id,
            fee,
            failure_reason,
            phone,
            country,
            updated_at
          `)
          .single();


      if (
        updateError
      ) {

        console.error(
          "Erreur enregistrement webhook :",
          updateError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer le webhook.",
          },
          500,
        );

      }


      console.log(
        "Webhook enregistré en mode test.",
      );


      return jsonResponse(
        {
          success: true,

          testMode:
            true,

          message:
            "Webhook SebPay reçu et signature vérifiée. Aucun statut métier n'a été modifié.",

          event: {

            transactionId,

            externalReference,

            status,

            amount,

            currency,

            customerPhone,

          },

          withdrawal:
            updatedWithdrawal,

        },
        200,
      );

    }


    // ==================================================
    // TRAITEMENT FINAL
    // ==================================================
    //
    // Cette partie sera activée après validation
    // complète du mode test.
    //
    // ==================================================

    if (
      status ===
      "pending"
    ) {

      return jsonResponse(
        {
          success: true,
          message:
            "Webhook pending reçu.",
        },
        200,
      );

    }


    if (
      status ===
      "approved"
    ) {

      // Le statut "paid" sera activé après validation
      // du webhook en mode test.

      return jsonResponse(
        {
          success: true,
          message:
            "Webhook approved reçu. Traitement final non encore activé.",
        },
        200,
      );

    }


    if (
      status ===
      "rejected"
    ) {

      // Le statut "Échec" sera activé après validation
      // du webhook en mode test.

      return jsonResponse(
        {
          success: true,
          message:
            "Webhook rejected reçu. Traitement final non encore activé.",
        },
        200,
      );

    }


    return jsonResponse(
      {
        success: true,
        message:
          "Webhook reçu.",
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