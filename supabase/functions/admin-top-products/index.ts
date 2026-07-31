import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("orders")
    .select("product_name, amount");

  if (error) {
    return new Response(
      JSON.stringify(error),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const products: Record<string, any> = {};

  data.forEach(order => {

    if (!products[order.product_name]) {

      products[order.product_name] = {

        product_name: order.product_name,

        sales: 0,

        revenue: 0

      };

    }

    products[order.product_name].sales++;

    products[order.product_name].revenue += Number(order.amount);

  });

  const result = Object.values(products)
    .sort((a: any, b: any) => b.revenue - a.revenue);

  return new Response(
    JSON.stringify(result),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );

});