-- Fix overly permissive RLS policies

-- Drop and recreate chat_rooms INSERT policy with proper check
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = public.get_profile_id(auth.uid()));

-- Drop and recreate chat_room_members INSERT policy with proper restriction  
DROP POLICY IF EXISTS "Users can join public rooms" ON public.chat_room_members;
CREATE POLICY "Users can join public rooms or be added by admins"
  ON public.chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND room_id IN (SELECT id FROM public.chat_rooms WHERE is_private = false)) OR
    public.is_admin(auth.uid())
  );

-- Add policy for room admins to add members to private rooms
CREATE POLICY "Room admins can add members to private rooms"
  ON public.chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM public.chat_room_members 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );