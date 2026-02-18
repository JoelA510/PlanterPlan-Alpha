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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          email: string
          granted_at: string | null
          granted_by: string | null
          user_id: string
        }
        Insert: {
          email: string
          granted_at?: string | null
          granted_by?: string | null
          user_id: string
        }
        Update: {
          email?: string
          granted_at?: string | null
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          project_id: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          project_id?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          project_id?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          project_id: string
          role: string
          token: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          project_id: string
          role: string
          token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          project_id?: string
          role?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          fts: unknown
          id: string
          metadata: Json | null
          project_id: string
          resource_id: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          metadata?: Json | null
          project_id: string
          resource_id?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          metadata?: Json | null
          project_id?: string
          resource_id?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "task_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_chunks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_chunks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_chunks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      task_relationships: {
        Row: {
          created_at: string | null
          from_task_id: string | null
          id: string
          project_id: string | null
          to_task_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          from_task_id?: string | null
          id?: string
          project_id?: string | null
          to_task_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          from_task_id?: string | null
          id?: string
          project_id?: string | null
          to_task_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_relationships_from_task_id_fkey"
            columns: ["from_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_from_task_id_fkey"
            columns: ["from_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_from_task_id_fkey"
            columns: ["from_task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_to_task_id_fkey"
            columns: ["to_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_to_task_id_fkey"
            columns: ["to_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relationships_to_task_id_fkey"
            columns: ["to_task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      task_resources: {
        Row: {
          created_at: string
          id: string
          resource_text: string | null
          resource_type: Database["public"]["Enums"]["task_resource_type"]
          resource_url: string | null
          storage_bucket: string | null
          storage_path: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_text?: string | null
          resource_type: Database["public"]["Enums"]["task_resource_type"]
          resource_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_text?: string | null
          resource_type?: Database["public"]["Enums"]["task_resource_type"]
          resource_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actions: string | null
          assignee_id: string | null
          created_at: string | null
          creator: string | null
          days_from_start: number | null
          description: string | null
          due_date: string | null
          id: string
          is_complete: boolean | null
          is_locked: boolean | null
          is_premium: boolean | null
          location: string | null
          notes: string | null
          origin: string | null
          parent_project_id: string | null
          parent_task_id: string | null
          position: number | null
          prerequisite_phase_id: string | null
          primary_resource_id: string | null
          priority: string | null
          project_type: string | null
          purpose: string | null
          root_id: string | null
          settings: Json | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actions?: string | null
          assignee_id?: string | null
          created_at?: string | null
          creator?: string | null
          days_from_start?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_complete?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          location?: string | null
          notes?: string | null
          origin?: string | null
          parent_project_id?: string | null
          parent_task_id?: string | null
          position?: number | null
          prerequisite_phase_id?: string | null
          primary_resource_id?: string | null
          priority?: string | null
          project_type?: string | null
          purpose?: string | null
          root_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actions?: string | null
          assignee_id?: string | null
          created_at?: string | null
          creator?: string | null
          days_from_start?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_complete?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          location?: string | null
          notes?: string | null
          origin?: string | null
          parent_project_id?: string | null
          parent_task_id?: string | null
          position?: number | null
          prerequisite_phase_id?: string | null
          primary_resource_id?: string | null
          priority?: string | null
          project_type?: string | null
          purpose?: string | null
          root_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prerequisite_phase_id_fkey"
            columns: ["prerequisite_phase_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prerequisite_phase_id_fkey"
            columns: ["prerequisite_phase_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prerequisite_phase_id_fkey"
            columns: ["prerequisite_phase_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_primary_resource_id_fkey"
            columns: ["primary_resource_id"]
            isOneToOne: false
            referencedRelation: "task_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tasks_with_primary_resource: {
        Row: {
          actions: string | null
          assignee_id: string | null
          created_at: string | null
          creator: string | null
          days_from_start: number | null
          description: string | null
          due_date: string | null
          id: string | null
          is_complete: boolean | null
          is_locked: boolean | null
          is_premium: boolean | null
          location: string | null
          notes: string | null
          origin: string | null
          parent_project_id: string | null
          parent_task_id: string | null
          position: number | null
          prerequisite_phase_id: string | null
          primary_resource_id: string | null
          priority: string | null
          project_type: string | null
          purpose: string | null
          resource_id: string | null
          resource_name: string | null
          resource_text: string | null
          resource_type: string | null
          resource_url: string | null
          root_id: string | null
          settings: Json | null
          start_date: string | null
          status: string | null
          storage_path: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actions?: string | null
          assignee_id?: string | null
          created_at?: string | null
          creator?: string | null
          days_from_start?: number | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_complete?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          location?: string | null
          notes?: string | null
          origin?: string | null
          parent_project_id?: string | null
          parent_task_id?: string | null
          position?: number | null
          prerequisite_phase_id?: string | null
          primary_resource_id?: string | null
          priority?: string | null
          project_type?: string | null
          purpose?: string | null
          resource_id?: never
          resource_name?: never
          resource_text?: never
          resource_type?: never
          resource_url?: never
          root_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          storage_path?: never
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actions?: string | null
          assignee_id?: string | null
          created_at?: string | null
          creator?: string | null
          days_from_start?: number | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_complete?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          location?: string | null
          notes?: string | null
          origin?: string | null
          parent_project_id?: string | null
          parent_task_id?: string | null
          position?: number | null
          prerequisite_phase_id?: string | null
          primary_resource_id?: string | null
          priority?: string | null
          project_type?: string | null
          purpose?: string | null
          resource_id?: never
          resource_name?: never
          resource_text?: never
          resource_type?: never
          resource_url?: never
          root_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          storage_path?: never
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prerequisite_phase_id_fkey"
            columns: ["prerequisite_phase_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prerequisite_phase_id_fkey"
            columns: ["prerequisite_phase_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prerequisite_phase_id_fkey"
            columns: ["prerequisite_phase_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_primary_resource_id_fkey"
            columns: ["primary_resource_id"]
            isOneToOne: false
            referencedRelation: "task_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
      view_master_library: {
        Row: {
          actions: string | null
          created_at: string | null
          creator: string | null
          days_from_start: number | null
          description: string | null
          due_date: string | null
          id: string | null
          is_complete: boolean | null
          notes: string | null
          origin: string | null
          parent_task_id: string | null
          position: number | null
          primary_resource_id: string | null
          purpose: string | null
          resource_id: string | null
          root_id: string | null
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actions?: string | null
          created_at?: string | null
          creator?: string | null
          days_from_start?: number | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_complete?: boolean | null
          notes?: string | null
          origin?: string | null
          parent_task_id?: string | null
          position?: number | null
          primary_resource_id?: string | null
          purpose?: string | null
          resource_id?: string | null
          root_id?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actions?: string | null
          created_at?: string | null
          creator?: string | null
          days_from_start?: number | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_complete?: boolean | null
          notes?: string | null
          origin?: string | null
          parent_task_id?: string | null
          position?: number | null
          primary_resource_id?: string | null
          purpose?: string | null
          resource_id?: string | null
          root_id?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_primary_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "task_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_primary_resource_id_fkey"
            columns: ["primary_resource_id"]
            isOneToOne: false
            referencedRelation: "task_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_primary_resource"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "view_master_library"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_project_ownership: {
        Args: { p_id: string; u_id: string }
        Returns: boolean
      }
      clone_project_template:
        | {
            Args: {
              p_new_origin: string
              p_new_parent_id: string
              p_template_id: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_description?: string
              p_due_date?: string
              p_new_origin: string
              p_new_parent_id: string
              p_start_date?: string
              p_template_id: string
              p_title?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_description?: string
              p_due_date?: string
              p_new_origin: string
              p_new_parent_id: string
              p_start_date?: string
              p_template_id: string
              p_title?: string
              p_user_id: string
            }
            Returns: Json
          }
      debug_create_project: {
        Args: { p_creator_id: string; p_title: string }
        Returns: Json
      }
      get_invite_details: { Args: { p_token: string }; Returns: Json }
      get_task_root_id: { Args: { p_task_id: string }; Returns: string }
      get_user_id_by_email: { Args: { email: string }; Returns: string }
      has_project_role: {
        Args: { allowed_roles: string[]; pid: string; uid: string }
        Returns: boolean
      }
      initialize_default_project: {
        Args: { p_creator_id: string; p_project_id: string }
        Returns: Json
      }
      invite_user_to_project: {
        Args: { p_email: string; p_project_id: string; p_role: string }
        Returns: Json
      }
      is_active_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      rag_get_project_context: {
        Args: { p_limit?: number; p_project_id: string }
        Returns: Json
      }
    }
    Enums: {
      task_resource_type: "pdf" | "url" | "text"
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
      task_resource_type: ["pdf", "url", "text"],
    },
  },
} as const
