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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          cargo_type: string
          carrier_name: string | null
          created_at: string
          disposition: string | null
          dock_id: string | null
          driver_contact: string
          driver_name: string | null
          estimated_minutes: number
          id: string
          nf_access_key: string | null
          nf_file_url: string | null
          nf_number: string | null
          nf_status: string
          nf_volumes: number
          observations: string | null
          palette_count: number
          protocol: string | null
          refusal_reason: string | null
          refusal_reason_id: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          supplier_id: string
          updated_at: string
          vehicle_plate: string
          vehicle_type: string
        }
        Insert: {
          cargo_type: string
          carrier_name?: string | null
          created_at?: string
          disposition?: string | null
          dock_id?: string | null
          driver_contact: string
          driver_name?: string | null
          estimated_minutes: number
          id?: string
          nf_access_key?: string | null
          nf_file_url?: string | null
          nf_number?: string | null
          nf_status?: string
          nf_volumes?: number
          observations?: string | null
          palette_count?: number
          protocol?: string | null
          refusal_reason?: string | null
          refusal_reason_id?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          supplier_id: string
          updated_at?: string
          vehicle_plate: string
          vehicle_type: string
        }
        Update: {
          cargo_type?: string
          carrier_name?: string | null
          created_at?: string
          disposition?: string | null
          dock_id?: string | null
          driver_contact?: string
          driver_name?: string | null
          estimated_minutes?: number
          id?: string
          nf_access_key?: string | null
          nf_file_url?: string | null
          nf_number?: string | null
          nf_status?: string
          nf_volumes?: number
          observations?: string | null
          palette_count?: number
          protocol?: string | null
          refusal_reason?: string | null
          refusal_reason_id?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          vehicle_plate?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          name: string
          number: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          number: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          number?: string
        }
        Relationships: []
      }
      checkers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      dock_blocks: {
        Row: {
          blocked_date: string
          blocked_time: string
          created_at: string
          dock_id: string
          id: string
          kind: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          created_at?: string
          dock_id: string
          id?: string
          kind?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          created_at?: string
          dock_id?: string
          id?: string
          kind?: string
          reason?: string | null
        }
        Relationships: []
      }
      docks: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      fixed_schedules: {
        Row: {
          created_at: string
          dock_id: string
          id: string
          scheduled_time: string
          supplier_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          dock_id: string
          id?: string
          scheduled_time: string
          supplier_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          dock_id?: string
          id?: string
          scheduled_time?: string
          supplier_id?: string
          weekday?: number
        }
        Relationships: []
      }
      loads: {
        Row: {
          branch_id: string
          checker_id: string | null
          closed_at: string | null
          created_at: string
          driver_id: string | null
          id: string
          partial_cut_count: number
          status: string
        }
        Insert: {
          branch_id: string
          checker_id?: string | null
          closed_at?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          partial_cut_count?: number
          status?: string
        }
        Update: {
          branch_id?: string
          checker_id?: string | null
          closed_at?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          partial_cut_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_checker_id_fkey"
            columns: ["checker_id"]
            isOneToOne: false
            referencedRelation: "checkers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acesso_analytics: boolean
          acesso_tms: boolean
          acesso_wms: boolean
          acesso_yms: boolean
          category: string
          created_at: string
          email: string
          id: string
          name: string
          nome_completo: string
          perfil_categoria: string
          username: string
        }
        Insert: {
          acesso_analytics?: boolean
          acesso_tms?: boolean
          acesso_wms?: boolean
          acesso_yms?: boolean
          category?: string
          created_at?: string
          email: string
          id: string
          name?: string
          nome_completo: string
          perfil_categoria: string
          username: string
        }
        Update: {
          acesso_analytics?: boolean
          acesso_tms?: boolean
          acesso_wms?: boolean
          acesso_yms?: boolean
          category?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          nome_completo?: string
          perfil_categoria?: string
          username?: string
        }
        Relationships: []
      }
      refusal_reasons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      supplier_accounts: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          password_hash: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          password_hash: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          password_hash?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_sessions: {
        Row: {
          created_at: string
          expires_at: string
          supplier_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          supplier_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          supplier_id?: string
          token?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          cnpj: string
          created_at: string
          email: string
          id: string
          nome_fantasia: string
          razao_social: string
          whatsapp: string
        }
        Insert: {
          active?: boolean
          cnpj: string
          created_at?: string
          email: string
          id?: string
          nome_fantasia: string
          razao_social: string
          whatsapp: string
        }
        Update: {
          active?: boolean
          cnpj?: string
          created_at?: string
          email?: string
          id?: string
          nome_fantasia?: string
          razao_social?: string
          whatsapp?: string
        }
        Relationships: []
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
      volumes: {
        Row: {
          barcode: string
          created_at: string
          group_completed: boolean
          id: string
          load_id: string
          scanned_count: number
          total_boxes: number | null
        }
        Insert: {
          barcode: string
          created_at?: string
          group_completed?: boolean
          id?: string
          load_id: string
          scanned_count?: number
          total_boxes?: number | null
        }
        Update: {
          barcode?: string
          created_at?: string
          group_completed?: boolean
          id?: string
          load_id?: string
          scanned_count?: number
          total_boxes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "volumes_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      work_hours: {
        Row: {
          enabled: boolean
          end_time: string
          id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          weekday: number
        }
        Update: {
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crypt_password: {
        Args: { p: string }
        Returns: {
          hash: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_supplier_password: {
        Args: { h: string; p: string }
        Returns: {
          ok: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "operator"
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
      app_role: ["admin", "operator"],
    },
  },
} as const
