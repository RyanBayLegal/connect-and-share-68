-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'department_manager', 'employee', 'contractor');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT,
  department_id UUID REFERENCES public.departments(id),
  manager_id UUID REFERENCES public.profiles(id),
  phone TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create announcement_categories table
CREATE TABLE public.announcement_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.announcement_categories(id),
  priority TEXT NOT NULL DEFAULT 'general' CHECK (priority IN ('critical', 'important', 'general')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_department_id UUID REFERENCES public.departments(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create announcement_reads table to track who has read what
CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

-- Create document_folders table
CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id),
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  folder_id UUID REFERENCES public.document_folders(id),
  uploaded_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat_room_members table
CREATE TABLE public.chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- Create messages table for both DMs and room messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Either room_id or recipient_id must be set, but not both
  CONSTRAINT message_type_check CHECK (
    (room_id IS NOT NULL AND recipient_id IS NULL) OR 
    (room_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- Create comments table for announcements and documents
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_target_check CHECK (
    (announcement_id IS NOT NULL AND document_id IS NULL) OR 
    (announcement_id IS NULL AND document_id IS NOT NULL)
  )
);

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Human Resources', 'Employee relations and recruitment'),
  ('Marketing', 'Brand management and communications'),
  ('Sales', 'Revenue generation and client relations'),
  ('Finance', 'Financial planning and accounting'),
  ('Operations', 'Business operations and logistics');

-- Insert default announcement categories
INSERT INTO public.announcement_categories (name, color) VALUES
  ('Company News', '#3B82F6'),
  ('HR Updates', '#10B981'),
  ('Events', '#F59E0B'),
  ('Policy Changes', '#EF4444'),
  ('Team Updates', '#8B5CF6');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_folders_updated_at BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin (super_admin or department_manager)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'department_manager')
  )
$$;

-- Create function to get user's profile id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id
$$;

-- Create function to get user's department id
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments (read by all authenticated, manage by admins)
CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for profiles
CREATE POLICY "Authenticated users can view active profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_active = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for user_roles (only super admins can manage)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for announcement categories
CREATE POLICY "Authenticated users can view categories"
  ON public.announcement_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.announcement_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for announcements
CREATE POLICY "Users can view published announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    is_published = true AND (
      target_department_id IS NULL OR
      target_department_id = public.get_user_department(auth.uid()) OR
      public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for announcement reads
CREATE POLICY "Users can view own reads"
  ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark as read"
  ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for document folders
CREATE POLICY "Users can view accessible folders"
  ON public.document_folders FOR SELECT TO authenticated
  USING (
    is_public = true OR
    department_id = public.get_user_department(auth.uid()) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can manage folders"
  ON public.document_folders FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for documents
CREATE POLICY "Users can view accessible documents"
  ON public.documents FOR SELECT TO authenticated
  USING (
    folder_id IN (
      SELECT id FROM public.document_folders
      WHERE is_public = true OR
        department_id = public.get_user_department(auth.uid()) OR
        public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for chat rooms
CREATE POLICY "Users can view rooms they are members of or public rooms"
  ON public.chat_rooms FOR SELECT TO authenticated
  USING (
    is_private = false OR
    id IN (SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create rooms"
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Room creators and admins can update rooms"
  ON public.chat_rooms FOR UPDATE TO authenticated
  USING (
    created_by = public.get_profile_id(auth.uid()) OR
    public.is_admin(auth.uid())
  );

-- RLS Policies for chat room members
CREATE POLICY "Users can view room members"
  ON public.chat_room_members FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT id FROM public.chat_rooms 
      WHERE is_private = false OR 
        id IN (SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join public rooms"
  ON public.chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (SELECT id FROM public.chat_rooms WHERE is_private = false)
  );

CREATE POLICY "Room admins can manage members"
  ON public.chat_room_members FOR ALL TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM public.chat_room_members 
      WHERE user_id = auth.uid() AND is_admin = true
    ) OR public.is_admin(auth.uid())
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their rooms or DMs"
  ON public.messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR
    recipient_id = auth.uid() OR
    room_id IN (SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      recipient_id IS NOT NULL OR
      room_id IN (SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- RLS Policies for comments
CREATE POLICY "Users can view comments"
  ON public.comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own comments or admins"
  ON public.comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin(auth.uid()));

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);