import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the calling user
    const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
    if (!callingUser) {
      throw new Error("Unauthorized");
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if caller is super_admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "super_admin")
      .single();

    if (!callerRoles) {
      throw new Error("Only super admins can create users");
    }

    // Parse request body
    const { email, password, firstName, lastName, role, departmentId, jobTitle, phone, location, managerId } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      throw new Error("Missing required fields: email, password, firstName, lastName");
    }

    console.log(`Creating user: ${email} with role: ${role || 'employee'}`);

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    const userId = authData.user.id;
    console.log(`Auth user created with ID: ${userId}`);

    // Create profile
    const profileData: Record<string, any> = {
      user_id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      is_active: true,
    };

    // Add optional fields if provided
    if (departmentId) profileData.department_id = departmentId;
    if (jobTitle) profileData.job_title = jobTitle;
    if (phone) profileData.phone = phone;
    if (location) profileData.location = location;
    if (managerId) profileData.manager_id = managerId;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(profileData);

    if (profileError) {
      console.error("Profile error:", profileError);
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log("Profile created successfully");

    // Assign role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: role || "employee",
    });

    if (roleError) {
      console.error("Role error:", roleError);
      throw roleError;
    }

    console.log(`Role ${role || 'employee'} assigned successfully`);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
