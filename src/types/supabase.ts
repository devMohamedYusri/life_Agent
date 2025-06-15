export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_name: string
          avatar_url: string | null
          timezone: string | null
          interests: Json | null
          lifestyle_patterns: Json | null
          goal_summary: Json | null
          habit_summary: Json | null
          mood_patterns: Json | null
          ai_personalization_settings: Json | null
          last_updated_by_ai: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          user_name: string
          avatar_url?: string | null
          timezone?: string | null
          interests?: Json | null
          lifestyle_patterns?: Json | null
          goal_summary?: Json | null
          habit_summary?: Json | null
          mood_patterns?: Json | null
          ai_personalization_settings?: Json | null
          last_updated_by_ai?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_name?: string
          avatar_url?: string | null
          timezone?: string | null
          interests?: Json | null
          lifestyle_patterns?: Json | null
          goal_summary?: Json | null
          habit_summary?: Json | null
          mood_patterns?: Json | null
          ai_personalization_settings?: Json | null
          last_updated_by_ai?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      categories: {
        Row: {
          category_id: string
          user_id: string
          name: string
          color: string | null
          icon: string | null
          description: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string
          user_id: string
          name: string
          color?: string | null
          icon?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          user_id?: string
          name?: string
          color?: string | null
          icon?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      goals: {
        Row: {
          goal_id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          goal_type: 'short-term' | 'long-term'
          progress: number
          deadline: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'active' | 'completed' | 'paused' | 'cancelled'
          is_ai_suggested: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          goal_id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          goal_type: 'short-term' | 'long-term'
          progress?: number
          deadline?: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'active' | 'completed' | 'paused' | 'cancelled'
          is_ai_suggested?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          goal_id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          goal_type?: 'short-term' | 'long-term'
          progress?: number
          deadline?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          is_ai_suggested?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      tasks: {
        Row: {
          task_id: string
          user_id: string
          goal_id: string | null
          category_id: string | null
          title: string
          description: string | null
          is_completed: boolean
          due_date: string | null
          completed_at: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          estimated_duration: number | null
          is_recurring: boolean
          recurrence_pattern: Json | null
          is_ai_suggested: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          task_id?: string
          user_id: string
          goal_id?: string | null
          category_id?: string | null
          title: string
          description?: string | null
          is_completed?: boolean
          due_date?: string | null
          completed_at?: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          estimated_duration?: number | null
          is_recurring?: boolean
          recurrence_pattern?: Json | null
          is_ai_suggested?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          task_id?: string
          user_id?: string
          goal_id?: string | null
          category_id?: string | null
          title?: string
          description?: string | null
          is_completed?: boolean
          due_date?: string | null
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          estimated_duration?: number | null
          is_recurring?: boolean
          recurrence_pattern?: Json | null
          is_ai_suggested?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      habits: {
        Row: {
          habit_id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          reminder_time: string | null
          frequency: 'daily' | 'weekly' | 'monthly'
          target_count: number
          is_ai_suggested: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          habit_id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          reminder_time?: string | null
          frequency: 'daily' | 'weekly' | 'monthly'
          target_count: number
          is_ai_suggested?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          habit_id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          reminder_time?: string | null
          frequency?: 'daily' | 'weekly' | 'monthly'
          target_count?: number
          is_ai_suggested?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      habit_completions: {
        Row: {
          completion_id: string
          habit_id: string
          user_id: string
          completion_date: string
          is_completed: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          completion_id?: string
          habit_id: string
          user_id: string
          completion_date: string
          is_completed: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          completion_id?: string
          habit_id?: string
          user_id?: string
          completion_date?: string
          is_completed?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      journal_entries: {
        Row: {
          entry_id: string
          user_id: string
          content: string
          mood: string | null
          tags: string[] | null
          documents: Json | null
          links: Json | null
          notes: string | null
          is_ai_prompted: boolean
          entry_date: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          entry_id?: string
          user_id: string
          content: string
          mood?: string | null
          tags?: string[] | null
          documents?: Json | null
          links?: Json | null
          notes?: string | null
          is_ai_prompted?: boolean
          entry_date: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          entry_id?: string
          user_id?: string
          content?: string
          mood?: string | null
          tags?: string[] | null
          documents?: Json | null
          links?: Json | null
          notes?: string | null
          is_ai_prompted?: boolean
          entry_date?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      ai_plans: {
        Row: {
          plan_id: string
          user_id: string
          goal_id: string | null
          prompt: string
          generated_plan: Json
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          plan_id?: string
          user_id: string
          goal_id?: string | null
          prompt: string
          generated_plan: Json
          status: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          plan_id?: string
          user_id?: string
          goal_id?: string | null
          prompt?: string
          generated_plan?: Json
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string | null
        }
      }
      conversation_summaries: {
        Row: {
          summary_id: string
          user_id: string
          summary_text: string
          conversation_start: string
          conversation_end: string | null
          topics: Json | null
          ai_model_version: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          summary_id?: string
          user_id: string
          summary_text: string
          conversation_start: string
          conversation_end?: string | null
          topics?: Json | null
          ai_model_version?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          summary_id?: string
          user_id?: string
          summary_text?: string
          conversation_start?: string
          conversation_end?: string | null
          topics?: Json | null
          ai_model_version?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      rewards: {
        Row: {
          reward_id: string
          user_id: string
          points: number
          reward_type: string | null
          reward_description: string | null
          redeemed_at: string | null
          created_at: string
        }
        Insert: {
          reward_id?: string
          user_id: string
          points: number
          reward_type?: string | null
          reward_description?: string | null
          redeemed_at?: string | null
          created_at?: string
        }
        Update: {
          reward_id?: string
          user_id?: string
          points?: number
          reward_type?: string | null
          reward_description?: string | null
          redeemed_at?: string | null
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          event_id: string
          user_id: string
          task_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          all_day: boolean
          location: string | null
          color: string | null
          is_ai_scheduled: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          event_id?: string
          user_id: string
          task_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          all_day: boolean
          location?: string | null
          color?: string | null
          is_ai_scheduled?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          event_id?: string
          user_id?: string
          task_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          location?: string | null
          color?: string | null
          is_ai_scheduled?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          work_hours: Json | null
          work_days: string[] | null
          break_duration: number | null
          focus_time_blocks: number | null
          notification_settings: Json | null
          ai_assistance_level: 'minimal' | 'moderate' | 'aggressive'
          theme: string | null
          language: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          work_hours?: Json | null
          work_days?: string[] | null
          break_duration?: number | null
          focus_time_blocks?: number | null
          notification_settings?: Json | null
          ai_assistance_level: 'minimal' | 'moderate' | 'aggressive'
          theme?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          work_hours?: Json | null
          work_days?: string[] | null
          break_duration?: number | null
          focus_time_blocks?: number | null
          notification_settings?: Json | null
          ai_assistance_level?: 'minimal' | 'moderate' | 'aggressive'
          theme?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          entity_id: string | null
          entity_type: string | null
          title: string
          message: string
          scheduled_for: string | null
          status: 'pending' | 'sent' | 'read'
          read_at: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          entity_id?: string | null
          entity_type?: string | null
          title: string
          message: string
          scheduled_for?: string | null
          status: 'pending' | 'sent' | 'read'
          read_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          entity_id?: string | null
          entity_type?: string | null
          title?: string
          message?: string
          scheduled_for?: string | null
          status?: 'pending' | 'sent' | 'read'
          read_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
} 