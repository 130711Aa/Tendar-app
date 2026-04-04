import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenant_id, name, email, password } = await req.json();

    if (!tenant_id || !name || !email || !password) {
      throw new Error("Missing required fields");
    }

    // 1. Initialize Supabase clients
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Verify requester is authorized (must be logged in)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // 3. Verify requester is admin of the tenant (use supabaseAdmin to bypass RLS)
    const { data: roleCheck, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleCheck) {
      throw new Error("Forbidden: You must be an admin of this tenant to add staff");
    }

    // 4. Check plan limits
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("plan")
      .eq("id", tenant_id)
      .single();

    const plan = tenant?.plan || "free";
    const limits = { free: 1, starter: 1, business: 2, pro: 99999 };
    const maxStaff = limits[plan as keyof typeof limits] || 1;

    // count current staff
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant_id);

    if (countError) throw countError;

    if (count !== null && count >= maxStaff) {
       throw new Error(`Batas staff (${maxStaff}) tercapai untuk paket ${plan.toUpperCase()}. Silakan upgrade paket langganan.`);
    }

    // 5. Create new Auth User using Admin API
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: name }
    });

    if (authError) {
      // If user already exists in auth.users, we don't handle it smoothly here yet, 
      // but standard supabase error will say "User already registered"
      throw new Error(authError.message);
    }

    if (!newAuthUser.user) throw new Error("Failed to create user");

    // 6. Assign 'staff' role to the new user for this tenant
    const { error: insertRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newAuthUser.user.id,
        tenant_id: tenant_id,
        role: "staff"
      });

    if (insertRoleError) {
      // Rollback auth user creation if we failed to assign role
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
      throw new Error("Gagal memberikan role staff ke user baru");
    }

    return new Response(JSON.stringify({ success: true, user: newAuthUser.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[create-staff]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan sistem" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
