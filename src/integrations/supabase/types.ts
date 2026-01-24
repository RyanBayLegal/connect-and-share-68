export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean
          priority: string
          published_at: string | null
          target_department_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          priority?: string
          published_at?: string | null
          target_department_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          priority?: string
          published_at?: string | null
          target_department_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "announcement_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: string
          is_admin: boolean
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_admin?: boolean
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_admin?: boolean
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clockify_connections: {
        Row: {
          access_token: string
          clockify_user_id: string | null
          clockify_workspace_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          clockify_user_id?: string | null
          clockify_workspace_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          clockify_user_id?: string | null
          clockify_workspace_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          announcement_id: string | null
          author_id: string
          content: string
          created_at: string
          document_id: string | null
          id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          announcement_id?: string | null
          author_id: string
          content: string
          created_at?: string
          document_id?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          announcement_id?: string | null
          author_id?: string
          content?: string
          created_at?: string
          document_id?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_public: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_public?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_public?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_deductions: {
        Row: {
          amount: number
          created_at: string | null
          deduction_type_id: string
          employee_id: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          deduction_type_id: string
          employee_id: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deduction_type_id?: string
          employee_id?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          created_at: string | null
          employee_id: string
          id: string
          start_date: string | null
          status: string | null
          target_completion_date: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          start_date?: string | null
          status?: string | null
          target_completion_date?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          start_date?: string | null
          status?: string | null
          target_completion_date?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          end_date: string
          event_type: string
          id: string
          is_all_day: boolean
          is_recurring: boolean
          location: string | null
          recurrence_rule: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date: string
          event_type?: string
          id?: string
          is_all_day?: boolean
          is_recurring?: boolean
          location?: string | null
          recurrence_rule?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          is_all_day?: boolean
          is_recurring?: boolean
          location?: string | null
          recurrence_rule?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews: {
        Row: {
          created_at: string | null
          id: string
          is_featured: boolean | null
          rating: number
          review_date: string | null
          review_text: string
          reviewer_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          rating: number
          review_date?: string | null
          review_text: string
          reviewer_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          rating?: number
          review_date?: string | null
          review_text?: string
          reviewer_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string | null
          room_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string | null
          room_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string | null
          room_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          is_completed: boolean | null
          item_id: string
          notes: string | null
          onboarding_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean | null
          item_id: string
          notes?: string | null
          onboarding_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean | null
          item_id?: string
          notes?: string | null
          onboarding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "employee_onboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          position: number | null
          template_id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          position?: number | null
          template_id: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          position?: number | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_stubs: {
        Row: {
          created_at: string | null
          deductions: Json | null
          employee_id: string
          gross_pay: number | null
          id: string
          net_pay: number | null
          overtime_hours: number | null
          payroll_run_id: string
          pto_hours: number | null
          regular_hours: number | null
        }
        Insert: {
          created_at?: string | null
          deductions?: Json | null
          employee_id: string
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          overtime_hours?: number | null
          payroll_run_id: string
          pto_hours?: number | null
          regular_hours?: number | null
        }
        Update: {
          created_at?: string | null
          deductions?: Json | null
          employee_id?: string
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          overtime_hours?: number | null
          payroll_run_id?: string
          pto_hours?: number | null
          regular_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_stubs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_stubs_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_deduction_types: {
        Row: {
          created_at: string | null
          default_amount: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          name?: string
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          pay_date: string
          period_end: string
          period_start: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          pay_date: string
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          pay_date?: string
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          annual_salary: number | null
          created_at: string | null
          employee_id: string
          hourly_rate: number | null
          id: string
          overtime_multiplier: number | null
          pay_type: string | null
          standard_hours_per_week: number | null
          tax_withholding_percent: number | null
          updated_at: string | null
        }
        Insert: {
          annual_salary?: number | null
          created_at?: string | null
          employee_id: string
          hourly_rate?: number | null
          id?: string
          overtime_multiplier?: number | null
          pay_type?: string | null
          standard_hours_per_week?: number | null
          tax_withholding_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          annual_salary?: number | null
          created_at?: string | null
          employee_id?: string
          hourly_rate?: number | null
          id?: string
          overtime_multiplier?: number | null
          pay_type?: string | null
          standard_hours_per_week?: number | null
          tax_withholding_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_hired: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          id: string
          is_active: boolean
          job_title: string | null
          last_name: string
          location: string | null
          manager_id: string | null
          personal_email: string | null
          personal_phone: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_hired?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_name: string
          location?: string | null
          manager_id?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_hired?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_name?: string
          location?: string | null
          manager_id?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders_sent: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string
          task_id: string
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string
          task_id: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_sent_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clock_in: string
          clock_out: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_manual_entry: boolean | null
          notes: string | null
          status_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clock_in: string
          clock_out?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_manual_entry?: boolean | null
          notes?: string | null
          status_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_manual_entry?: boolean | null
          notes?: string | null
          status_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "time_tracking_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          created_at: string | null
          employee_id: string
          end_date: string
          hours_requested: number | null
          id: string
          reason: string | null
          request_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          end_date: string
          hours_requested?: number | null
          id?: string
          reason?: string | null
          request_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          end_date?: string
          hours_requested?: number | null
          id?: string
          reason?: string | null
          request_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      time_tracking_statuses: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          name: string
          position: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name: string
          position?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name?: string
          position?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_statuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          status: string | null
          submitted_at: string | null
          total_overtime_hours: number | null
          total_pto_hours: number | null
          total_regular_hours: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string | null
          submitted_at?: string | null
          total_overtime_hours?: number | null
          total_pto_hours?: number | null
          total_regular_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          submitted_at?: string | null
          total_overtime_hours?: number | null
          total_pto_hours?: number | null
          total_regular_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          duration_hours: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          due_date: string | null
          employee_id: string
          id: string
          progress_percent: number | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_materials: {
        Row: {
          course_id: string
          created_at: string | null
          external_url: string | null
          file_path: string | null
          id: string
          position: number | null
          title: string
          type: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          position?: number | null
          title: string
          type?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          position?: number | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wiki_article_versions: {
        Row: {
          article_id: string
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string | null
          id: string
          title: string
          version_number: number
        }
        Insert: {
          article_id: string
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          title: string
          version_number: number
        }
        Update: {
          article_id?: string
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "wiki_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "wiki_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_article_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_articles: {
        Row: {
          article_type: string
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          current_version: number
          department_id: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          last_edited_by: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          article_type?: string
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          current_version?: number
          department_id?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          last_edited_by?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          article_type?: string
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          current_version?: number
          department_id?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          last_edited_by?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "wiki_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wiki_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_articles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_articles_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      wiki_templates: {
        Row: {
          article_type: string
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          article_type?: string
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          article_type?: string
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wiki_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      get_user_department: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_hr_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "department_manager"
        | "employee"
        | "contractor"
        | "training_manager"
        | "hr_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "department_manager",
        "employee",
        "contractor",
        "training_manager",
        "hr_manager",
      ],
    },
  },
} as const
