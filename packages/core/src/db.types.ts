export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audio_profiles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_system: boolean;
          kind: Database['public']['Enums']['profile_kind_t'];
          min_plan: Database['public']['Enums']['plan_t'];
          name: string;
          owner_org_id: string | null;
          owner_user_id: string | null;
          params: Json;
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          kind: Database['public']['Enums']['profile_kind_t'];
          min_plan?: Database['public']['Enums']['plan_t'];
          name: string;
          owner_org_id?: string | null;
          owner_user_id?: string | null;
          params: Json;
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          kind?: Database['public']['Enums']['profile_kind_t'];
          min_plan?: Database['public']['Enums']['plan_t'];
          name?: string;
          owner_org_id?: string | null;
          owner_user_id?: string | null;
          params?: Json;
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audio_profiles_owner_org_id_fkey';
            columns: ['owner_org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      devices: {
        Row: {
          ble_id: string | null;
          created_at: string;
          firmware: string | null;
          id: string;
          kind: Database['public']['Enums']['device_kind_t'];
          last_seen_at: string | null;
          name: string;
          status: Database['public']['Enums']['device_status_t'];
          updated_at: string;
          zone_id: string | null;
        };
        Insert: {
          ble_id?: string | null;
          created_at?: string;
          firmware?: string | null;
          id?: string;
          kind: Database['public']['Enums']['device_kind_t'];
          last_seen_at?: string | null;
          name: string;
          status?: Database['public']['Enums']['device_status_t'];
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          ble_id?: string | null;
          created_at?: string;
          firmware?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['device_kind_t'];
          last_seen_at?: string | null;
          name?: string;
          status?: Database['public']['Enums']['device_status_t'];
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_zone_id_fkey';
            columns: ['zone_id'];
            isOneToOne: false;
            referencedRelation: 'zones';
            referencedColumns: ['id'];
          },
        ];
      };
      location_reports: {
        Row: {
          created_at: string;
          data: Json;
          id: string;
          location_id: string;
          updated_at: string;
          week_start: string;
        };
        Insert: {
          created_at?: string;
          data: Json;
          id?: string;
          location_id: string;
          updated_at?: string;
          week_start: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          id?: string;
          location_id?: string;
          updated_at?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'location_reports_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          area_size: string | null;
          birds_active: string | null;
          business_hours: Json | null;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['place_kind_t'] | null;
          limit_audible: boolean;
          name: string;
          org_id: string;
          people_nearby: boolean;
          target: Database['public']['Enums']['bird_target_t'] | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          area_size?: string | null;
          birds_active?: string | null;
          business_hours?: Json | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['place_kind_t'] | null;
          limit_audible?: boolean;
          name: string;
          org_id: string;
          people_nearby?: boolean;
          target?: Database['public']['Enums']['bird_target_t'] | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          area_size?: string | null;
          birds_active?: string | null;
          business_hours?: Json | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['place_kind_t'] | null;
          limit_audible?: boolean;
          name?: string;
          org_id?: string;
          people_nearby?: boolean;
          target?: Database['public']['Enums']['bird_target_t'] | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'locations_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      org_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          org_id: string;
          role: Database['public']['Enums']['member_role_t'];
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id: string;
          role?: Database['public']['Enums']['member_role_t'];
          token?: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id?: string;
          role?: Database['public']['Enums']['member_role_t'];
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'org_invites_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      org_members: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          role: Database['public']['Enums']['member_role_t'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          role?: Database['public']['Enums']['member_role_t'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          role?: Database['public']['Enums']['member_role_t'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'org_members_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          contact_email: string | null;
          created_at: string;
          id: string;
          name: string;
          plan: Database['public']['Enums']['org_plan_t'];
          stripe_customer_id: string | null;
          updated_at: string;
        };
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          plan?: Database['public']['Enums']['org_plan_t'];
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          plan?: Database['public']['Enums']['org_plan_t'];
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          plan: Database['public']['Enums']['plan_t'];
          rc_app_user_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          plan?: Database['public']['Enums']['plan_t'];
          rc_app_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          plan?: Database['public']['Enums']['plan_t'];
          rc_app_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      protection_plans: {
        Row: {
          created_at: string;
          days: number[];
          ends_on: string | null;
          id: string;
          interval_seconds: number;
          name: string;
          output: Database['public']['Enums']['output_kind_t'];
          owner_org_id: string | null;
          owner_user_id: string | null;
          quiet_end: string | null;
          quiet_start: string | null;
          randomize_order: boolean;
          session_minutes: number;
          sound_ids: string[];
          starts_on: string | null;
          target: Database['public']['Enums']['bird_target_t'];
          updated_at: string;
          user_place_id: string | null;
          volume: number;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string;
          days?: number[];
          ends_on?: string | null;
          id?: string;
          interval_seconds?: number;
          name: string;
          output?: Database['public']['Enums']['output_kind_t'];
          owner_org_id?: string | null;
          owner_user_id?: string | null;
          quiet_end?: string | null;
          quiet_start?: string | null;
          randomize_order?: boolean;
          session_minutes?: number;
          sound_ids?: string[];
          starts_on?: string | null;
          target?: Database['public']['Enums']['bird_target_t'];
          updated_at?: string;
          user_place_id?: string | null;
          volume?: number;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          days?: number[];
          ends_on?: string | null;
          id?: string;
          interval_seconds?: number;
          name?: string;
          output?: Database['public']['Enums']['output_kind_t'];
          owner_org_id?: string | null;
          owner_user_id?: string | null;
          quiet_end?: string | null;
          quiet_start?: string | null;
          randomize_order?: boolean;
          session_minutes?: number;
          sound_ids?: string[];
          starts_on?: string | null;
          target?: Database['public']['Enums']['bird_target_t'];
          updated_at?: string;
          user_place_id?: string | null;
          volume?: number;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'protection_plans_owner_org_id_fkey';
            columns: ['owner_org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'protection_plans_user_place_id_fkey';
            columns: ['user_place_id'];
            isOneToOne: false;
            referencedRelation: 'user_places';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'protection_plans_zone_id_fkey';
            columns: ['zone_id'];
            isOneToOne: false;
            referencedRelation: 'zones';
            referencedColumns: ['id'];
          },
        ];
      };
      schedules: {
        Row: {
          created_at: string;
          days: number[];
          enabled: boolean;
          end_time: string;
          executor: Database['public']['Enums']['schedule_executor_t'];
          id: string;
          offset_minutes: number;
          plan_id: string | null;
          profile_id: string;
          quiet_end: string | null;
          quiet_start: string | null;
          start_time: string;
          trigger: Database['public']['Enums']['schedule_trigger_t'];
          updated_at: string;
          zone_id: string;
        };
        Insert: {
          created_at?: string;
          days: number[];
          enabled?: boolean;
          end_time: string;
          executor?: Database['public']['Enums']['schedule_executor_t'];
          id?: string;
          offset_minutes?: number;
          plan_id?: string | null;
          profile_id: string;
          quiet_end?: string | null;
          quiet_start?: string | null;
          start_time: string;
          trigger?: Database['public']['Enums']['schedule_trigger_t'];
          updated_at?: string;
          zone_id: string;
        };
        Update: {
          created_at?: string;
          days?: number[];
          enabled?: boolean;
          end_time?: string;
          executor?: Database['public']['Enums']['schedule_executor_t'];
          id?: string;
          offset_minutes?: number;
          plan_id?: string | null;
          profile_id?: string;
          quiet_end?: string | null;
          quiet_start?: string | null;
          start_time?: string;
          trigger?: Database['public']['Enums']['schedule_trigger_t'];
          updated_at?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedules_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'protection_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'schedules_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'audio_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'schedules_zone_id_fkey';
            columns: ['zone_id'];
            isOneToOne: false;
            referencedRelation: 'zones';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          device_id: string | null;
          ended_at: string | null;
          id: string;
          output_kind: Database['public']['Enums']['output_kind_t'];
          peak_freq_hz: number | null;
          plan_id: string | null;
          profile_id: string;
          result: Database['public']['Enums']['session_result_t'] | null;
          source: Database['public']['Enums']['session_source_t'];
          started_at: string;
          updated_at: string;
          user_id: string;
          user_place_id: string | null;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string;
          device_id?: string | null;
          ended_at?: string | null;
          id?: string;
          output_kind: Database['public']['Enums']['output_kind_t'];
          peak_freq_hz?: number | null;
          plan_id?: string | null;
          profile_id: string;
          result?: Database['public']['Enums']['session_result_t'] | null;
          source?: Database['public']['Enums']['session_source_t'];
          started_at?: string;
          updated_at?: string;
          user_id: string;
          user_place_id?: string | null;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          device_id?: string | null;
          ended_at?: string | null;
          id?: string;
          output_kind?: Database['public']['Enums']['output_kind_t'];
          peak_freq_hz?: number | null;
          plan_id?: string | null;
          profile_id?: string;
          result?: Database['public']['Enums']['session_result_t'] | null;
          source?: Database['public']['Enums']['session_source_t'];
          started_at?: string;
          updated_at?: string;
          user_id?: string;
          user_place_id?: string | null;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_device_id_fkey';
            columns: ['device_id'];
            isOneToOne: false;
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'protection_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'audio_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_user_place_id_fkey';
            columns: ['user_place_id'];
            isOneToOne: false;
            referencedRelation: 'user_places';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_zone_id_fkey';
            columns: ['zone_id'];
            isOneToOne: false;
            referencedRelation: 'zones';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          org_id: string | null;
          product_id: string;
          provider: string;
          raw: Json | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          org_id?: string | null;
          product_id: string;
          provider: string;
          raw?: Json | null;
          status: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          org_id?: string | null;
          product_id?: string;
          provider?: string;
          raw?: Json | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      user_devices: {
        Row: {
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['device_kind_t'];
          last_seen_at: string | null;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['device_kind_t'];
          last_seen_at?: string | null;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['device_kind_t'];
          last_seen_at?: string | null;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_places: {
        Row: {
          area_size: string | null;
          birds_active: string | null;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['place_kind_t'] | null;
          limit_audible: boolean;
          name: string;
          people_nearby: boolean;
          target: Database['public']['Enums']['bird_target_t'] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area_size?: string | null;
          birds_active?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['place_kind_t'] | null;
          limit_audible?: boolean;
          name: string;
          people_nearby?: boolean;
          target?: Database['public']['Enums']['bird_target_t'] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          area_size?: string | null;
          birds_active?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['place_kind_t'] | null;
          limit_audible?: boolean;
          name?: string;
          people_nearby?: boolean;
          target?: Database['public']['Enums']['bird_target_t'] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_schedules: {
        Row: {
          created_at: string;
          days: number[];
          enabled: boolean;
          end_time: string;
          executor: Database['public']['Enums']['schedule_executor_t'];
          id: string;
          offset_minutes: number;
          plan_id: string | null;
          profile_id: string;
          quiet_end: string | null;
          quiet_start: string | null;
          start_time: string;
          trigger: Database['public']['Enums']['schedule_trigger_t'];
          updated_at: string;
          user_id: string;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string;
          days: number[];
          enabled?: boolean;
          end_time: string;
          executor?: Database['public']['Enums']['schedule_executor_t'];
          id?: string;
          offset_minutes?: number;
          plan_id?: string | null;
          profile_id: string;
          quiet_end?: string | null;
          quiet_start?: string | null;
          start_time: string;
          trigger?: Database['public']['Enums']['schedule_trigger_t'];
          updated_at?: string;
          user_id: string;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          days?: number[];
          enabled?: boolean;
          end_time?: string;
          executor?: Database['public']['Enums']['schedule_executor_t'];
          id?: string;
          offset_minutes?: number;
          plan_id?: string | null;
          profile_id?: string;
          quiet_end?: string | null;
          quiet_start?: string | null;
          start_time?: string;
          trigger?: Database['public']['Enums']['schedule_trigger_t'];
          updated_at?: string;
          user_id?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_schedules_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'protection_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_schedules_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'audio_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_schedules_zone_id_fkey';
            columns: ['zone_id'];
            isOneToOne: false;
            referencedRelation: 'zones';
            referencedColumns: ['id'];
          },
        ];
      };
      zones: {
        Row: {
          active_profile_id: string | null;
          created_at: string;
          id: string;
          location_id: string;
          name: string;
          trigger_mode: Database['public']['Enums']['trigger_mode_t'];
          updated_at: string;
        };
        Insert: {
          active_profile_id?: string | null;
          created_at?: string;
          id?: string;
          location_id: string;
          name: string;
          trigger_mode?: Database['public']['Enums']['trigger_mode_t'];
          updated_at?: string;
        };
        Update: {
          active_profile_id?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string;
          name?: string;
          trigger_mode?: Database['public']['Enums']['trigger_mode_t'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'zones_active_profile_id_fkey';
            columns: ['active_profile_id'];
            isOneToOne: false;
            referencedRelation: 'audio_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'zones_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string };
      create_org: { Args: { p_name: string }; Returns: string };
      current_email: { Args: never; Returns: string };
      delete_my_account: { Args: never; Returns: undefined };
      device_org: { Args: { device: string }; Returns: string };
      end_session: { Args: { p_session_id: string }; Returns: number };
      history: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          ended_at: string;
          id: string;
          location_id: string;
          location_name: string;
          minutes: number;
          output_kind: Database['public']['Enums']['output_kind_t'];
          peak_freq_hz: number;
          place_name: string;
          plan_id: string;
          plan_name: string;
          profile_id: string;
          profile_name: string;
          result: Database['public']['Enums']['session_result_t'];
          source: Database['public']['Enums']['session_source_t'];
          started_at: string;
          user_id: string;
          user_place_id: string;
          zone_id: string;
          zone_name: string;
        }[];
      };
      invite_member: {
        Args: {
          p_email: string;
          p_org_id: string;
          p_role?: Database['public']['Enums']['member_role_t'];
        };
        Returns: string;
      };
      is_org_member: {
        Args: {
          min_role?: Database['public']['Enums']['member_role_t'];
          org: string;
        };
        Returns: boolean;
      };
      location_org: { Args: { loc: string }; Returns: string };
      location_report: {
        Args: { p_location_id: string; p_week_start: string };
        Returns: {
          sessions: number;
          total_minutes: number;
          zones_active: number;
        }[];
      };
      my_memberships: {
        Args: never;
        Returns: {
          name: string;
          org_id: string;
          plan: Database['public']['Enums']['org_plan_t'];
          role: Database['public']['Enums']['member_role_t'];
        }[];
      };
      my_orgs: {
        Args: never;
        Returns: {
          id: string;
          name: string;
          plan: Database['public']['Enums']['org_plan_t'];
          role: Database['public']['Enums']['member_role_t'];
        }[];
      };
      org_member_list: {
        Args: { p_org_id: string };
        Returns: {
          display_name: string;
          email: string;
          joined_at: string;
          role: Database['public']['Enums']['member_role_t'];
          user_id: string;
        }[];
      };
      place_feedback: {
        Args: { p_user_place_id: string };
        Returns: {
          best_plan_name: string;
          left_count: number;
          not_yet_count: number;
          sessions_total: number;
          sessions_with_result: number;
          some_left_count: number;
        }[];
      };
      profile_peak_freq_hz: { Args: { p_profile_id: string }; Returns: number };
      remove_member: {
        Args: { p_org_id: string; p_user_id: string };
        Returns: boolean;
      };
      report_session_result: {
        Args: {
          p_result: Database['public']['Enums']['session_result_t'];
          p_session_id: string;
        };
        Returns: undefined;
      };
      role_rank: {
        Args: { r: Database['public']['Enums']['member_role_t'] };
        Returns: number;
      };
      start_session: {
        Args: {
          p_device_id?: string;
          p_output?: Database['public']['Enums']['output_kind_t'];
          p_plan_id?: string;
          p_profile_id: string;
          p_source?: Database['public']['Enums']['session_source_t'];
          p_user_place_id?: string;
          p_zone_id: string;
        };
        Returns: string;
      };
      zone_activity: {
        Args: { p_from?: string; p_to?: string; p_zone_id: string };
        Returns: {
          day: string;
          sessions: number;
          total_minutes: number;
        }[];
      };
      zone_feedback: {
        Args: { p_zone_id: string };
        Returns: {
          best_plan_name: string;
          left_count: number;
          not_yet_count: number;
          sessions_total: number;
          sessions_with_result: number;
          some_left_count: number;
        }[];
      };
      zone_live_status: {
        Args: { p_location_id: string };
        Returns: {
          current_session_id: string;
          profile_name: string;
          running: boolean;
          started_at: string;
          zone_id: string;
          zone_name: string;
        }[];
      };
      zone_org: { Args: { zone: string }; Returns: string };
    };
    Enums: {
      bird_target_t: 'pigeons' | 'gulls' | 'starlings' | 'corvids' | 'mixed_small' | 'unsure';
      device_kind_t: 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';
      device_status_t: 'online' | 'offline' | 'unknown';
      member_role_t: 'owner' | 'manager' | 'staff';
      org_plan_t: 'free' | 'business' | 'enterprise';
      output_kind_t: 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';
      place_kind_t:
        | 'balcony'
        | 'roof'
        | 'dock'
        | 'storefront'
        | 'warehouse'
        | 'parking'
        | 'garden'
        | 'farm'
        | 'custom';
      plan_t: 'free' | 'pro' | 'business' | 'enterprise';
      profile_kind_t: 'tone' | 'sweep' | 'pulse' | 'sample';
      schedule_executor_t: 'device' | 'reminder';
      schedule_trigger_t: 'time' | 'sunrise' | 'sunset';
      session_result_t: 'left' | 'some_left' | 'not_yet' | 'unknown';
      session_source_t: 'manual' | 'schedule' | 'remote';
      trigger_mode_t: 'manual' | 'schedule' | 'motion';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bird_target_t: ['pigeons', 'gulls', 'starlings', 'corvids', 'mixed_small', 'unsure'],
      device_kind_t: ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'],
      device_status_t: ['online', 'offline', 'unknown'],
      member_role_t: ['owner', 'manager', 'staff'],
      org_plan_t: ['free', 'business', 'enterprise'],
      output_kind_t: ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'],
      place_kind_t: [
        'balcony',
        'roof',
        'dock',
        'storefront',
        'warehouse',
        'parking',
        'garden',
        'farm',
        'custom',
      ],
      plan_t: ['free', 'pro', 'business', 'enterprise'],
      profile_kind_t: ['tone', 'sweep', 'pulse', 'sample'],
      schedule_executor_t: ['device', 'reminder'],
      schedule_trigger_t: ['time', 'sunrise', 'sunset'],
      session_result_t: ['left', 'some_left', 'not_yet', 'unknown'],
      session_source_t: ['manual', 'schedule', 'remote'],
      trigger_mode_t: ['manual', 'schedule', 'motion'],
    },
  },
} as const;
