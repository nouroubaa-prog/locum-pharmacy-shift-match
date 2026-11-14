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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          locum_id: string
          message: string | null
          shift_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          locum_id: string
          message?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          locum_id?: string
          message?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_locum_id_fkey"
            columns: ["locum_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      locum_profiles: {
        Row: {
          available_days: number[]
          available_from: string | null
          available_until: string | null
          base_country: Database["public"]["Enums"]["country_code"]
          base_lat: number | null
          base_lng: number | null
          base_town: string
          bio: string | null
          created_at: string
          gphc_number: string | null
          preferred_currency: Database["public"]["Enums"]["currency_code"]
          preferred_rate: number | null
          psi_number: string | null
          radius_km: number
          updated_at: string
          user_id: string
          years_experience: number
        }
        Insert: {
          available_days?: number[]
          available_from?: string | null
          available_until?: string | null
          base_country?: Database["public"]["Enums"]["country_code"]
          base_lat?: number | null
          base_lng?: number | null
          base_town?: string
          bio?: string | null
          created_at?: string
          gphc_number?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          preferred_rate?: number | null
          psi_number?: string | null
          radius_km?: number
          updated_at?: string
          user_id: string
          years_experience?: number
        }
        Update: {
          available_days?: number[]
          available_from?: string | null
          available_until?: string | null
          base_country?: Database["public"]["Enums"]["country_code"]
          base_lat?: number | null
          base_lng?: number | null
          base_town?: string
          bio?: string | null
          created_at?: string
          gphc_number?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          preferred_rate?: number | null
          psi_number?: string | null
          radius_km?: number
          updated_at?: string
          user_id?: string
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "locum_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          address_line: string
          contact_email: string | null
          contact_phone: string | null
          country: Database["public"]["Enums"]["country_code"]
          county: string | null
          created_at: string
          id: string
          is_demo: boolean
          lat: number | null
          lng: number | null
          name: string
          owner_id: string
          postcode: string | null
          town: string
          updated_at: string
        }
        Insert: {
          address_line: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          county?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          owner_id: string
          postcode?: string | null
          town: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          county?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          owner_id?: string
          postcode?: string | null
          town?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          contact_email: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          full_name: string
          id: string
          onboarded: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          contact_email?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          full_name?: string
          id: string
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          contact_email?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          full_name?: string
          id?: string
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_contacts: {
        Row: {
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          shift_id: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          shift_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          shift_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_contacts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: true
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          address_line: string
          application_deadline: string
          cancelled_at: string | null
          country: Database["public"]["Enums"]["country_code"]
          county: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          employer_id: string
          end_time: string
          filled_at: string | null
          hourly_rate: number
          id: string
          is_demo: boolean
          lat: number | null
          lng: number | null
          min_experience_years: number
          moderation: Database["public"]["Enums"]["moderation_status"]
          notes: string | null
          pharmacy_id: string
          pharmacy_name: string
          postcode: string | null
          published_at: string | null
          required_registration: Database["public"]["Enums"]["registration_body"]
          requirements: string | null
          role_title: string
          shift_date: string
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
          town: string
          updated_at: string
        }
        Insert: {
          address_line: string
          application_deadline: string
          cancelled_at?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          county?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          employer_id: string
          end_time: string
          filled_at?: string | null
          hourly_rate: number
          id?: string
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          min_experience_years?: number
          moderation?: Database["public"]["Enums"]["moderation_status"]
          notes?: string | null
          pharmacy_id: string
          pharmacy_name: string
          postcode?: string | null
          published_at?: string | null
          required_registration?: Database["public"]["Enums"]["registration_body"]
          requirements?: string | null
          role_title?: string
          shift_date: string
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"]
          town: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          application_deadline?: string
          cancelled_at?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          county?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          employer_id?: string
          end_time?: string
          filled_at?: string | null
          hourly_rate?: number
          id?: string
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          min_experience_years?: number
          moderation?: Database["public"]["Enums"]["moderation_status"]
          notes?: string | null
          pharmacy_id?: string
          pharmacy_name?: string
          postcode?: string | null
          published_at?: string | null
          required_registration?: Database["public"]["Enums"]["registration_body"]
          requirements?: string | null
          role_title?: string
          shift_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"]
          town?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_shift_moderation: {
        Args: {
          _moderation: Database["public"]["Enums"]["moderation_status"]
          _shift_id: string
        }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: {
          _status: Database["public"]["Enums"]["account_status"]
          _user_id: string
        }
        Returns: undefined
      }
      choose_account_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      has_active_application: {
        Args: { _shift_id: string; _user_id: string }
        Returns: boolean
      }
      has_applied: {
        Args: { _shift_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_applicant_of_employer: {
        Args: { _employer_id: string; _locum_id: string }
        Returns: boolean
      }
      mark_shift_filled: {
        Args: { _application_id?: string; _shift_id: string }
        Returns: undefined
      }
      owns_shift: {
        Args: { _shift_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended"
      app_role: "admin" | "employer" | "locum"
      application_status:
        | "pending"
        | "shortlisted"
        | "accepted"
        | "declined"
        | "withdrawn"
      country_code: "IE" | "UK"
      currency_code: "EUR" | "GBP"
      moderation_status: "visible" | "hidden"
      registration_body: "PSI" | "GPhC"
      report_reason:
        | "inaccurate"
        | "suspicious"
        | "inappropriate"
        | "duplicate"
        | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      shift_status: "draft" | "open" | "filled" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "suspended"],
      app_role: ["admin", "employer", "locum"],
      application_status: [
        "pending",
        "shortlisted",
        "accepted",
        "declined",
        "withdrawn",
      ],
      country_code: ["IE", "UK"],
      currency_code: ["EUR", "GBP"],
      moderation_status: ["visible", "hidden"],
      registration_body: ["PSI", "GPhC"],
      report_reason: [
        "inaccurate",
        "suspicious",
        "inappropriate",
        "duplicate",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      shift_status: ["draft", "open", "filled", "cancelled"],
    },
  },
} as const
