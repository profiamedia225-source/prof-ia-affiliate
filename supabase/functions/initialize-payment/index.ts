import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    const { orderId } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({
          error: "orderId manquant"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({
          error: "Commande introuvable"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: order.user_email,
          amount: Math.round(Number(order.amount) * 100),
          reference: order.order_reference,
          currency: order.currency,
          metadata: {
            order_id: order.id,
            affiliate_id: order.affiliate_id,
            product_id: order.product_id
          }
        })
      }
    );

    const result = await response.json();
    if (!result.status) {
      return new Response(
        JSON.stringify(result),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        authorization_url: result.data.authorization_url,
        access_code: result.data.access_code,
        reference: result.data.reference
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    } catch (err) {

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err)
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  }

});