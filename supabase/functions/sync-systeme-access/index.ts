import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

// ==========================================
// CONFIGURATION SYSTEME.IO
// ==========================================

const SYSTEME_API_BASE =
  "https://api.systeme.io/api";

const SYSTEME_COURSE_ID = 637713;

const PRODUCT_ID =
  "formation_complete";

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

serve(async (req) => {

  // ========================================
  // CORS
  // ========================================

  if (req.method === "OPTIONS") {

    return new Response("ok", {
      headers: corsHeaders,
    });

  }

  // ========================================
  // MÉTHODE AUTORISÉE
  // ========================================

  if (req.method !== "POST") {

    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Méthode non autorisée. Utilisez POST.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );

  }

  try {

    // ========================================
    // CONFIGURATION SUPABASE
    // ========================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const systemeApiKey =
      Deno.env.get(
        "SYSTEME_API_KEY",
      );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !systemeApiKey
    ) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Configuration serveur incomplète.",
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

    // ========================================
    // AUTHENTIFICATION SUPABASE
    // ========================================

    const authorization =
      req.headers.get(
        "Authorization",
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer ",
      )
    ) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Authentification requise.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );

    }

    // Client utilisant la session
    const supabaseAuth =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        },
      );

    // ========================================
    // IDENTIFICATION DE L'UTILISATEUR
    // ========================================

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAuth.auth.getUser();

    if (
      userError ||
      !user
    ) {

      console.error(
        "Erreur authentification :",
        userError,
      );

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Utilisateur non authentifié.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );

    }

    console.log(
      "Utilisateur authentifié :",
      user.id,
    );

    // ========================================
    // CLIENT ADMIN SUPABASE
    // ========================================

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
      );

    // ========================================
    // VÉRIFICATION DE L'ACCÈS PRODUIT
    // ========================================

    const {
      data: access,
      error: accessError,
    } =
      await supabaseAdmin
        .from("product_access")
        .select(
          "id, user_id, product_id, status, order_id",
        )
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "product_id",
          PRODUCT_ID,
        )
        .eq(
          "status",
          "active",
        )
        .maybeSingle();

    if (accessError) {

      console.error(
        "Erreur vérification accès :",
        accessError,
      );

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Impossible de vérifier votre accès à la formation.",
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

    if (!access) {

      console.warn(
        "Accès formation refusé pour :",
        user.id,
      );

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Vous ne possédez pas d'accès actif à cette formation.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );

    }

    console.log(
      "Accès formation validé :",
      access.product_id,
    );

    // ========================================
    // RÉCUPÉRATION DE L'EMAIL AUTHENTIFIÉ
    // ========================================

    const systemeEmail =
      user.email
        ?.trim()
        .toLowerCase();

    if (!systemeEmail) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Adresse email du compte introuvable.",
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

    console.log(
      "SYSTEME.IO - Email authentifié :",
      systemeEmail,
    );

    console.log(
      "SYSTEME.IO - Course ID :",
      SYSTEME_COURSE_ID,
    );

    // ========================================
    // HEADERS SYSTEME.IO
    // ========================================

    const systemeHeaders = {
      "X-API-Key":
        systemeApiKey,

      "Accept":
        "application/json",

      "Content-Type":
        "application/json",
    };

    // ========================================
    // RECHERCHE DU CONTACT SYSTEME.IO
    // ========================================

    let contact: any = null;

    let startingAfter:
      number | null = null;

    let hasMore = true;

    while (
      hasMore &&
      !contact
    ) {

      const contactsUrl =
        new URL(
          `${SYSTEME_API_BASE}/contacts`,
        );

      contactsUrl.searchParams.set(
        "limit",
        "100",
      );

      contactsUrl.searchParams.set(
        "order",
        "asc",
      );

      if (
        startingAfter !== null
      ) {

        contactsUrl.searchParams.set(
          "startingAfter",
          String(
            startingAfter,
          ),
        );

      }

      const contactsResponse =
        await fetch(
          contactsUrl.toString(),
          {
            method: "GET",
            headers:
              systemeHeaders,
          },
        );

      const contactsResult =
        await contactsResponse.json();

      if (
        !contactsResponse.ok
      ) {

        console.error(
          "Erreur recherche contact Systeme.io :",
          JSON.stringify(
            contactsResult,
            null,
            2,
          ),
        );

        return new Response(
          JSON.stringify({
            success: false,
            step:
              "find_contact",
            status:
              contactsResponse.status,
            error:
              contactsResult,
          }),
          {
            status: 502,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          },
        );

      }

      const items =
        Array.isArray(
          contactsResult.items,
        )
          ? contactsResult.items
          : [];

      contact =
        items.find(
          (item: any) =>
            typeof item.email ===
              "string" &&
            item.email
              .trim()
              .toLowerCase() ===
              systemeEmail,
        ) ?? null;

      hasMore =
        contactsResult.hasMore ===
        true;

      if (
        hasMore &&
        items.length > 0
      ) {

        const lastItem =
          items[
            items.length - 1
          ];

        if (
          typeof lastItem.id ===
          "number"
        ) {

          startingAfter =
            lastItem.id;

        } else {

          hasMore = false;

        }

      } else {

        hasMore = false;

      }

    }

    // ========================================
    // CRÉATION DU CONTACT SI ABSENT
    // ========================================

    if (!contact) {

      console.log(
        "SYSTEME.IO - Contact inexistant. Création...",
      );

      const createContactResponse =
        await fetch(
          `${SYSTEME_API_BASE}/contacts`,
          {
            method: "POST",

            headers:
              systemeHeaders,

            body: JSON.stringify({
              email:
                systemeEmail,
              locale:
                "fr",
            }),
          },
        );

      const createContactResult =
        await createContactResponse.json();

      if (
        !createContactResponse.ok
      ) {

        console.error(
          "Erreur création contact :",
          JSON.stringify(
            createContactResult,
            null,
            2,
          ),
        );

        return new Response(
          JSON.stringify({
            success: false,
            step:
              "create_contact",
            status:
              createContactResponse.status,
            error:
              createContactResult,
          }),
          {
            status: 502,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          },
        );

      }

      contact =
        createContactResult;

      console.log(
        "Contact Systeme.io créé :",
        contact.id,
      );

    } else {

      console.log(
        "Contact Systeme.io trouvé :",
        contact.id,
      );

    }

    // ========================================
    // VALIDATION CONTACT
    // ========================================

    const contactId =
      Number(
        contact?.id,
      );

    if (
      !Number.isFinite(
        contactId,
      )
    ) {

      return new Response(
        JSON.stringify({
          success: false,
          step:
            "contact_validation",
          error:
            "ID du contact Systeme.io introuvable.",
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );

    }

    // ========================================
    // INSCRIPTION À LA FORMATION
    // ========================================

    console.log(
      "SYSTEME.IO - Inscription :",
      contactId,
      "→ cours",
      SYSTEME_COURSE_ID,
    );

    const enrollmentResponse =
      await fetch(
        `${SYSTEME_API_BASE}/school/courses/${SYSTEME_COURSE_ID}/enrollments`,
        {
          method: "POST",

          headers:
            systemeHeaders,

          body: JSON.stringify({
            contactId,
            accessType:
              "full_access",
          }),
        },
      );

    const enrollmentText =
      await enrollmentResponse.text();

    let enrollmentResult:
      any;

    try {

      enrollmentResult =
        enrollmentText
          ? JSON.parse(
              enrollmentText,
            )
          : null;

    } catch {

      enrollmentResult =
        enrollmentText;

    }

    // ========================================
    // INSCRIPTION RÉUSSIE
    // ========================================

    if (
      enrollmentResponse.ok
    ) {

      console.log(
        "SYSTEME.IO - INSCRIPTION RÉUSSIE",
      );

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Accès Systeme.io synchronisé.",
          userId:
            user.id,
          email:
            systemeEmail,
          productId:
            PRODUCT_ID,
          contactId,
          courseId:
            SYSTEME_COURSE_ID,
          accessType:
            "full_access",
          enrollment:
            enrollmentResult,
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

    }

    // ========================================
    // DÉJÀ INSCRIT
    // ========================================

    if (
      enrollmentResponse.status ===
      409
    ) {

      console.log(
        "SYSTEME.IO - Contact déjà inscrit.",
      );

      return new Response(
        JSON.stringify({
          success: true,
          alreadyEnrolled:
            true,
          message:
            "Le compte est déjà inscrit à la formation.",
          userId:
            user.id,
          email:
            systemeEmail,
          productId:
            PRODUCT_ID,
          contactId,
          courseId:
            SYSTEME_COURSE_ID,
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

    }

    // ========================================
    // ERREUR INSCRIPTION
    // ========================================

    console.error(
      "SYSTEME.IO - Erreur inscription :",
      JSON.stringify(
        enrollmentResult,
        null,
        2,
      ),
    );

    return new Response(
      JSON.stringify({
        success: false,
        step:
          "enrollment",
        status:
          enrollmentResponse.status,
        userId:
          user.id,
        email:
          systemeEmail,
        courseId:
          SYSTEME_COURSE_ID,
        error:
          enrollmentResult,
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );

  } catch (error) {

    console.error(
      "SYSTEME.IO - Erreur générale :",
      error,
    );

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
      },
    );

  }

});