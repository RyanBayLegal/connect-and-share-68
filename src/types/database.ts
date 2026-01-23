export type AppRole = 'super_admin' | 'department_manager' | 'employee' | 'contractor' | 'training_manager';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
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
  date_of_birth: string | null;
  date_hired: string | null;
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

export interface WikiCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  created_at: string;
}

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  department_id: string | null;
  author_id: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  current_version: number;
  last_edited_by: string | null;
  article_type: 'article' | 'policy';
  created_at: string;
  updated_at: string;
  category?: WikiCategory;
  author?: Profile;
  last_editor?: Profile;
}

export interface WikiArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string | null;
  edited_by: string | null;
  created_at: string;
  editor?: Profile;
}

// Onboarding Types
export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface OnboardingTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  category: string;
  position: number;
  created_at: string;
}

export interface EmployeeOnboarding {
  id: string;
  employee_id: string;
  template_id: string | null;
  assigned_by: string | null;
  start_date: string;
  target_completion_date: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Profile;
  template?: OnboardingTemplate;
}

export interface OnboardingProgress {
  id: string;
  onboarding_id: string;
  item_id: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  item?: OnboardingTemplateItem;
}

// Training Types
export interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_hours: number | null;
  is_mandatory: boolean;
  department_id: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface TrainingMaterial {
  id: string;
  course_id: string;
  title: string;
  type: string;
  file_path: string | null;
  external_url: string | null;
  position: number;
  created_at: string;
}

export interface TrainingEnrollment {
  id: string;
  course_id: string;
  employee_id: string;
  assigned_by: string | null;
  due_date: string | null;
  status: string;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  course?: TrainingCourse;
  employee?: Profile;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Google Reviews Types
export interface GoogleReview {
  id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  review_date: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}
