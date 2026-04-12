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
      clients: {
        Row: {
          activity_log: Json | null
          budget: string | null
          budget_notes: string | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          property_type: string | null
          stage: string | null
          whatsapp: string | null
          zone: string | null
          zone_specific: string | null
        }
        Insert: {
          activity_log?: Json | null
          budget?: string | null
          budget_notes?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          stage?: string | null
          whatsapp?: string | null
          zone?: string | null
          zone_specific?: string | null
        }
        Update: {
          activity_log?: Json | null
          budget?: string | null
          budget_notes?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          stage?: string | null
          whatsapp?: string | null
          zone?: string | null
          zone_specific?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          ambientes: number | null
          auto_id: number | null
          barrio_zona: string | null
          banos: string | null
          bano_servicio: string | null
          cartel: string | null
          city: string | null
          cochera: string | null
          comentario: string | null
          country: string | null
          created_at: string | null
          descripcion: string | null
          department: string | null
          disposicion: string | null
          distancia_mar_mts: number | null
          door_number: string | null
          dormitorios: string | null
          en_alquiler: string | null
          en_venta: string | null
          estado_prop: string | null
          frente_mar: string | null
          garage: string | null
          house_type: string | null
          id: string
          image_urls: Json | null
          manzana: string | null
          matterport_url: string | null
          notes: string | null
          nota_alquiler: string | null
          operation: string | null
          orientacion: string | null
          padron: string | null
          parada: string | null
          permuta: string | null
          plantas: number | null
          phone_number: string | null
          precio_alquiler: string | null
          precio_escritura: string | null
          precio_libre: string | null
          precio_portales: string | null
          precio_tasacion: string | null
          precio_venta: string | null
          price: string | null
          propiedad_horizontal: string | null
          property_type_detail: string | null
          piscina: string | null
          solar: string | null
          sup_cubierta: number | null
          sup_semi_cubierta: number | null
          sup_terreno: number | null
          terraza: string | null
          title: string
          type: string | null
          url: string | null
          video_url: string | null
          vista: string | null
          vigencia_alquiler: string | null
          vigencia_venta: string | null
          zone: string | null
          zone_specific: string | null
        }
        Insert: {
          address?: string | null
          ambientes?: number | null
          auto_id?: number | null
          barrio_zona?: string | null
          banos?: string | null
          bano_servicio?: string | null
          cartel?: string | null
          city?: string | null
          cochera?: string | null
          comentario?: string | null
          country?: string | null
          created_at?: string | null
          descripcion?: string | null
          department?: string | null
          disposicion?: string | null
          distancia_mar_mts?: number | null
          door_number?: string | null
          dormitorios?: string | null
          en_alquiler?: string | null
          en_venta?: string | null
          estado_prop?: string | null
          frente_mar?: string | null
          garage?: string | null
          house_type?: string | null
          id?: string
          image_urls?: Json | null
          manzana?: string | null
          matterport_url?: string | null
          notes?: string | null
          nota_alquiler?: string | null
          operation?: string | null
          orientacion?: string | null
          padron?: string | null
          parada?: string | null
          permuta?: string | null
          plantas?: number | null
          phone_number?: string | null
          precio_alquiler?: string | null
          precio_escritura?: string | null
          precio_libre?: string | null
          precio_portales?: string | null
          precio_tasacion?: string | null
          precio_venta?: string | null
          price?: string | null
          propiedad_horizontal?: string | null
          property_type_detail?: string | null
          piscina?: string | null
          solar?: string | null
          sup_cubierta?: number | null
          sup_semi_cubierta?: number | null
          sup_terreno?: number | null
          terraza?: string | null
          title: string
          type?: string | null
          url?: string | null
          video_url?: string | null
          vista?: string | null
          vigencia_alquiler?: string | null
          vigencia_venta?: string | null
          zone?: string | null
          zone_specific?: string | null
        }
        Update: {
          address?: string | null
          ambientes?: number | null
          auto_id?: number | null
          barrio_zona?: string | null
          banos?: string | null
          bano_servicio?: string | null
          cartel?: string | null
          city?: string | null
          cochera?: string | null
          comentario?: string | null
          country?: string | null
          created_at?: string | null
          descripcion?: string | null
          department?: string | null
          disposicion?: string | null
          distancia_mar_mts?: number | null
          door_number?: string | null
          dormitorios?: string | null
          en_alquiler?: string | null
          en_venta?: string | null
          estado_prop?: string | null
          frente_mar?: string | null
          garage?: string | null
          house_type?: string | null
          id?: string
          image_urls?: Json | null
          manzana?: string | null
          matterport_url?: string | null
          notes?: string | null
          nota_alquiler?: string | null
          operation?: string | null
          orientacion?: string | null
          padron?: string | null
          parada?: string | null
          permuta?: string | null
          plantas?: number | null
          phone_number?: string | null
          precio_alquiler?: string | null
          precio_escritura?: string | null
          precio_libre?: string | null
          precio_portales?: string | null
          precio_tasacion?: string | null
          precio_venta?: string | null
          price?: string | null
          propiedad_horizontal?: string | null
          property_type_detail?: string | null
          piscina?: string | null
          solar?: string | null
          sup_cubierta?: number | null
          sup_semi_cubierta?: number | null
          sup_terreno?: number | null
          terraza?: string | null
          title?: string
          type?: string | null
          url?: string | null
          video_url?: string | null
          vista?: string | null
          vigencia_alquiler?: string | null
          vigencia_venta?: string | null
          zone?: string | null
          zone_specific?: string | null
        }
        Relationships: []
      }
      property_links: {
        Row: {
          client_id: string | null
          colleague_agency: string | null
          created_at: string | null
          generated_url: string | null
          id: string
          property_type: string | null
        }
        Insert: {
          client_id?: string | null
          colleague_agency?: string | null
          created_at?: string | null
          generated_url?: string | null
          id?: string
          property_type?: string | null
        }
        Update: {
          client_id?: string | null
          colleague_agency?: string | null
          created_at?: string | null
          generated_url?: string | null
          id?: string
          property_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
