-- Create table to store Clockify OAuth connections per user
CREATE TABLE public.clockify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  clockify_user_id TEXT,
  clockify_workspace_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clockify_connections ENABLE ROW LEVEL SECURITY;

-- Users can only read their own connection
CREATE POLICY "Users can view their own clockify connection"
  ON public.clockify_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own connection
CREATE POLICY "Users can create their own clockify connection"
  ON public.clockify_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own connection
CREATE POLICY "Users can update their own clockify connection"
  ON public.clockify_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own connection
CREATE POLICY "Users can delete their own clockify connection"
  ON public.clockify_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_clockify_connections_updated_at
  BEFORE UPDATE ON public.clockify_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();