import { createClient } from "npm:@supabase/supabase-js@2";
import { sendNotification } from "../_shared/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STATUS = [
  "En attente",
  "paid",
  "Refusé",
];

Deno.serve(async (req) => {

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
    // Client Supabase avec Service Role
    // ==========================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ==========================================
    // Vérification de l'authentification
    // ==========================================

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {

      return new Response(
        JSON.stringify({
          error: "Non autorisé",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    const token =
      authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser(token);

    if (authError || !user) {

      return new Response(
        JSON.stringify({
          error: "Utilisateur invalide",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    // ==========================================
    // VÉRIFICATION DU RÔLE ADMINISTRATEUR
    // Seul super_admin est autorisé
    // ==========================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {

      console.error(
        "Erreur récupération profil :",
        profileError
      );

      return new Response(
        JSON.stringify({
          error: "Profil administrateur introuvable",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    if (profile.role !== "super_admin") {

      console.warn(
        "Accès refusé. Rôle :",
        profile.role,
        "Utilisateur :",
        user.id
      );

      return new Response(
        JSON.stringify({
          error:
            "Accès refusé. Seul un super administrateur peut gérer les retraits.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    // ==========================================
    // Récupération des paramètres
    // ==========================================

    const {
      withdrawalId,
      status,
    } = await req.json();

    if (!withdrawalId || !status) {

      return new Response(
        JSON.stringify({
          error: "Paramètres manquants",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    // ==========================================
    // Vérification du statut
    // ==========================================

    if (!ALLOWED_STATUS.includes(status)) {

      return new Response(
        JSON.stringify({
          error: "Statut invalide",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    // ==========================================
    // Vérifie que le retrait existe
    // ==========================================

    const {
      data: withdrawal,
      error: withdrawalError,
    } = await supabase
      .from("withdrawals")
      .select(
        "id, affiliate_id, status, amount"
      )
      .eq("id", withdrawalId)
      .single();

    if (withdrawalError || !withdrawal) {

      return new Response(
        JSON.stringify({
          error: "Retrait introuvable",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    // ==========================================
    // Mise à jour du statut du retrait
    // ==========================================

    const {
      error: updateError,
    } = await supabase
      .from("withdrawals")
      .update({
        status,
        processed_at:
          new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (updateError) {

      return new Response(
        JSON.stringify({
          error: updateError.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    }

    // ==========================================
    // Notification : retrait payé
    // ==========================================

    if (status === "paid") {

      await sendNotification(
        supabase,
        {
          userId:
            withdrawal.affiliate_id,

          type:
            "withdrawal_paid",

          title:
            "💳 Retrait validé",

          message:
            `Votre demande de retrait de ${Number(
              withdrawal.amount
            ).toLocaleString(
              "fr-FR"
            )} FCFA a été validée. Le paiement sera traité sous 72 heures.`,
        }
      );

    }

    // ==========================================
    // Notification : retrait refusé
    // ==========================================

    if (status === "Refusé") {

      await sendNotification(
        supabase,
        {
          userId:
            withdrawal.affiliate_id,

          type:
            "withdrawal_rejected",

          title:
            "❌ Retrait refusé",

          message:
            `Votre demande de retrait de ${Number(
              withdrawal.amount
            ).toLocaleString(
              "fr-FR"
            )} FCFA a été refusée. Veuillez contacter le support pour plus d'informations.`,
        }
      );

    }

    console.log(
      "Notification de retrait envoyée."
    );

    // ==========================================
    // IMPORTANT :
    // La table commissions n'est pas modifiée.
    //
    // Le solde disponible est calculé
    // dynamiquement par dashboard-stats :
    //
    // - commissions disponibles
    // - retraits En attente
    // - retraits paid
    //
    // Un retrait "Refusé" est exclu.
    // ==========================================

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Statut du retrait mis à jour avec succès.",
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
          "Content-Type":
            "application/json",
        },
      }
    );

  }

});