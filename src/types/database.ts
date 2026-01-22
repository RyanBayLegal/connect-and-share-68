export type AppRole = 'super_admin' | 'department_manager' | 'employee' | 'contractor';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
  manager?: Profile;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  priority: 'critical' | 'important' | 'general';
  author_id: string | null;
  target_department_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: AnnouncementCategory;
  author?: Profile;
}

export interface DocumentFolder {
  id: string;
  name: string;
  parent_id: string | null;
  department_id: string | null;
  created_by: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  folder_id: string | null;
  uploaded_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  folder?: DocumentFolder;
  uploader?: Profile;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  room_id: string | null;
  recipient_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: Profile;
}

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  announcement_id: string | null;
  document_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}
