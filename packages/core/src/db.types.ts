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
      locations: {
        Row: {
          address: string | null;
          business_hours: Json | null;
          created_at: string;
          id: string;
          name: string;
          org_id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          business_hours?: Json | null;
          created_at?: string;
          id?: string;
          name: string;
          org_id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          business_hours?: Json | null;
          created_at?: string;
          id?: string;
          name?: string;
          org_id?: string;
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
      schedules: {
        Row: {
          created_at: string;
          days: number[];
          enabled: boolean;
          end_time: string;
          executor: Database['public']['Enums']['schedule_executor_t'];
          id: string;
          profile_id: string;
          start_time: string;
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
          profile_id: string;
          start_time: string;
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
          profile_id?: string;
          start_time?: string;
          updated_at?: string;
          zone_id?: string;
        };
        Relationships: [
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
          profile_id: string;
          source: Database['public']['Enums']['session_source_t'];
          started_at: string;
          updated_at: string;
          user_id: string;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string;
          device_id?: string | null;
          ended_at?: string | null;
          id?: string;
          output_kind: Database['public']['Enums']['output_kind_t'];
          peak_freq_hz?: number | null;
          profile_id: string;
          source?: Database['public']['Enums']['session_source_t'];
          started_at?: string;
          updated_at?: string;
          user_id: string;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          device_id?: string | null;
          ended_at?: string | null;
          id?: string;
          output_kind?: Database['public']['Enums']['output_kind_t'];
          peak_freq_hz?: number | null;
          profile_id?: string;
          source?: Database['public']['Enums']['session_source_t'];
          started_at?: string;
          updated_at?: string;
          user_id?: string;
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
            foreignKeyName: 'sessions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'audio_profiles';
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
      device_org: { Args: { device: string }; Returns: string };
      end_session: { Args: { p_session_id: string }; Returns: number };
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
      my_orgs: {
        Args: never;
        Returns: {
          id: string;
          name: string;
          plan: Database['public']['Enums']['org_plan_t'];
          role: Database['public']['Enums']['member_role_t'];
        }[];
      };
      profile_peak_freq_hz: { Args: { p_profile_id: string }; Returns: number };
      role_rank: {
        Args: { r: Database['public']['Enums']['member_role_t'] };
        Returns: number;
      };
      start_session: {
        Args: {
          p_device_id?: string;
          p_output?: Database['public']['Enums']['output_kind_t'];
          p_profile_id: string;
          p_source?: Database['public']['Enums']['session_source_t'];
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
      zone_org: { Args: { zone: string }; Returns: string };
    };
    Enums: {
      device_kind_t: 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';
      device_status_t: 'online' | 'offline' | 'unknown';
      member_role_t: 'owner' | 'manager' | 'staff';
      org_plan_t: 'business' | 'enterprise';
      output_kind_t: 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';
      plan_t: 'free' | 'pro' | 'business' | 'enterprise';
      profile_kind_t: 'tone' | 'sweep' | 'pulse' | 'sample';
      schedule_executor_t: 'device' | 'reminder';
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
      device_kind_t: ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'],
      device_status_t: ['online', 'offline', 'unknown'],
      member_role_t: ['owner', 'manager', 'staff'],
      org_plan_t: ['business', 'enterprise'],
      output_kind_t: ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'],
      plan_t: ['free', 'pro', 'business', 'enterprise'],
      profile_kind_t: ['tone', 'sweep', 'pulse', 'sample'],
      schedule_executor_t: ['device', 'reminder'],
      session_source_t: ['manual', 'schedule', 'remote'],
      trigger_mode_t: ['manual', 'schedule', 'motion'],
    },
  },
} as const;
