
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendNotification } from "../_shared/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Méthode POST obligatoire." },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Configuration Supabase incomplète.");
      return jsonResponse(
        { success: false, error: "Configuration serveur incomplète." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        { success: false, error: "Authentification requise." },
        401,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const token = authHeader.slice(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { success: false, error: "Session invalide." },
        401,
      );
    }

    // Seul le super administrateur peut gérer les demandes.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "super_admin") {
      return jsonResponse(
        {
          success: false,
          error: "Accès refusé. Droits super administrateur requis.",
        },
        403,
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, error: "Corps JSON invalide." },
        400,
      );
    }

    const withdrawalId = body.withdrawalId;
    const requestedStatus = body.status;

    if (
      typeof withdrawalId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        withdrawalId,
      )
    ) {
      return jsonResponse(
        { success: false, error: "Identifiant de retrait invalide." },
        400,
      );
    }

    // IMPORTANT :
    // L'administration ne peut JAMAIS marquer un retrait comme payé.
    // Seul le webhook Jèko peut confirmer le statut final "paid".
    if (
      requestedStatus !== "En traitement" &&
      requestedStatus !== "Refusé"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Statut non autorisé. Seuls « En traitement » et « Refusé » sont acceptés.",
        },
        400,
      );
    }

    const { data: withdrawal, error: withdrawalError } =
      await supabase
        .from("withdrawals")
        .select("id, affiliate_id, status, amount")
        .eq("id", withdrawalId)
        .maybeSingle();

    if (withdrawalError) {
      console.error(
        "Erreur récupération retrait :",
        withdrawalError.message,
      );

      return jsonResponse(
        { success: false, error: "Impossible de vérifier le retrait." },
        500,
      );
    }

    if (!withdrawal) {
      return jsonResponse(
        { success: false, error: "Retrait introuvable." },
        404,
      );
    }

    // Cette fonction ne traite que les demandes encore en attente.
    // Elle ne peut pas modifier un transfert déjà envoyé à Jèko.
    if (withdrawal.status !== "En attente") {
      return jsonResponse(
        {
          success: false,
          error:
            `Transition refusée : le retrait est actuellement « ${withdrawal.status} ».`,
          current_status: withdrawal.status,
        },
        409,
      );
    }

    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      status: requestedStatus,
      updated_at: now,
    };

    if (requestedStatus === "Refusé") {
      updateData.processed_at = now;
      updateData.failure_reason =
        "Demande refusée par l'administration.";
    }

    // Mise à jour atomique : empêche deux administrateurs
    // de traiter simultanément la même demande.
    const { data: updatedRows, error: updateError } =
      await supabase
        .from("withdrawals")
        .update(updateData)
        .eq("id", withdrawalId)
        .eq("status", "En attente")
        .select("id, status");

    if (updateError) {
      console.error("Erreur mise à jour retrait :", updateError.message);

      return jsonResponse(
        { success: false, error: "Mise à jour du retrait impossible." },
        500,
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "Cette demande a déjà été modifiée. Actualisez la liste des retraits.",
        },
        409,
      );
    }

    // Notification uniquement en cas de refus.
    // La notification ne doit jamais modifier le résultat du retrait.
    if (requestedStatus === "Refusé" && withdrawal.affiliate_id) {
      try {
        await sendNotification(supabase, {
          userId: withdrawal.affiliate_id,
          type: "withdrawal_rejected",
          title: "❌ Retrait refusé",
          message:
            `Votre demande de retrait de ${Number(
              withdrawal.amount,
            ).toLocaleString("fr-FR")} FCFA a été refusée. Veuillez contacter le support pour plus d'informations.`,
        });
      } catch (notificationError) {
        console.error(
          "Retrait refusé, mais notification non envoyée :",
          notificationError instanceof Error
            ? notificationError.message
            : "Erreur inconnue",
        );
      }
    }

    return jsonResponse({
      success: true,
      message:
        requestedStatus === "En traitement"
          ? "Demande mise en traitement. Le transfert peut maintenant être déclenché."
          : "Demande refusée.",
      withdrawal_id: withdrawalId,
      status: requestedStatus,
    });
  } catch (error) {
    console.error(
      "Erreur admin-update-withdrawal :",
      error instanceof Error ? error.message : "Erreur inconnue",
    );

    return jsonResponse(
      { success: false, error: "Erreur interne du serveur." },
      500,
    );
  }
});
