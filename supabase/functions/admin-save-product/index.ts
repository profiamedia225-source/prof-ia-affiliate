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
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    const product = {

      product_name: body.product_name,

      product_code: body.product_code,

      description: body.description,

      price: Number(body.price),

      currency: body.currency,

      commission_rate:
        Number(body.commission_rate),

      systeme_course_url: body.systeme_course_url,

      status: body.status

    };

    let result;

    if (body.id) {

      result = await supabase

        .from("products")

        .update(product)

        .eq("id", body.id)

        .select()

        .single();

    } else {

      result = await supabase

        .from("products")

        .insert(product)

        .select()

        .single();

    }

    if (result.error) throw result.error;

    return new Response(

      JSON.stringify({

        success: true,

        product: result.data

      }),

      {

        headers: {

          ...corsHeaders,

          "Content-Type":
            "application/json"

        }

      }

    );

  }

  catch (error) {

    return new Response(

      JSON.stringify({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur"

      }),

      {

        status: 500,

        headers: {

          ...corsHeaders,

          "Content-Type":
            "application/json"

        }

      }

    );

  }

});