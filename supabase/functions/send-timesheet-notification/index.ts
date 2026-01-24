import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  timesheetId: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { timesheetId, employeeId, periodStart, periodEnd, totalHours }: NotificationRequest = await req.json();

    console.log('Processing timesheet notification:', { timesheetId, employeeId });

    // Fetch employee details
    const { data: employee, error: empError } = await supabase
      .from('profiles')
      .select('*, department:departments(*)')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      console.error('Error fetching employee:', empError);
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee found:', employee.first_name, employee.last_name);

    // Find managers to notify (HR managers and the employee's manager if they have one)
    const { data: hrManagers, error: hrError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['hr_manager', 'super_admin']);

    if (hrError) {
      console.error('Error fetching HR managers:', hrError);
    }

    const managerUserIds = hrManagers?.map(m => m.user_id) || [];

    // Get profiles of managers
    const { data: managerProfiles, error: profError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, user_id')
      .in('user_id', managerUserIds);

    if (profError) {
      console.error('Error fetching manager profiles:', profError);
    }

    console.log('Found', managerProfiles?.length || 0, 'managers to notify');

    // Create in-app notifications for each manager
    const notifications = (managerProfiles || []).map(manager => ({
      user_id: manager.user_id,
      title: 'Timesheet Submitted for Review',
      message: `${employee.first_name} ${employee.last_name} has submitted their timesheet for ${periodStart} to ${periodEnd} (${totalHours.toFixed(1)} hours)`,
      type: 'timesheet_submitted',
      read: false,
      metadata: {
        timesheet_id: timesheetId,
        employee_id: employeeId,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        period_start: periodStart,
        period_end: periodEnd,
        total_hours: totalHours,
      },
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log('Created', notifications.length, 'notifications');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notified ${notifications.length} managers`,
        notifiedManagers: managerProfiles?.map(m => `${m.first_name} ${m.last_name}`) || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in send-timesheet-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
