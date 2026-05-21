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
      answer_photos: {
        Row: {
          address: string | null
          answer_id: string
          caption: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          storage_path: string
        }
        Insert: {
          address?: string | null
          answer_id: string
          caption?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          storage_path: string
        }
        Update: {
          address?: string | null
          answer_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_photos_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          comment: string | null
          grid_values: Json | null
          id: string
          inspection_id: string
          notes: string | null
          question_id: string
          value_bool: boolean | null
          value_num: number | null
          value_text: string | null
        }
        Insert: {
          comment?: string | null
          grid_values?: Json | null
          id?: string
          inspection_id: string
          notes?: string | null
          question_id: string
          value_bool?: boolean | null
          value_num?: number | null
          value_text?: string | null
        }
        Update: {
          comment?: string | null
          grid_values?: Json | null
          id?: string
          inspection_id?: string
          notes?: string | null
          question_id?: string
          value_bool?: boolean | null
          value_num?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_questionnaire_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      bobcat_inspections: {
        Row: {
          address: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          equipment_model: string | null
          id: string
          inspection_date: string
          inspection_type: string | null
          inspector_name: string | null
          inspector_signature: string | null
          items: Json
          notes: string | null
          project_id: string
          registration_number: string | null
          status: string
          summary_photos: Json
          template_id: string | null
          updated_at: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          equipment_model?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector_name?: string | null
          inspector_signature?: string | null
          items?: Json
          notes?: string | null
          project_id: string
          registration_number?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          equipment_model?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector_name?: string | null
          inspector_signature?: string | null
          items?: Json
          notes?: string | null
          project_id?: string
          registration_number?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bobcat_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bobcat_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      breathalyzer_logs: {
        Row: {
          created_at: string
          date: string
          device_serial_number: string | null
          entries: Json
          id: string
          pdf_uri: string | null
          project_id: string
          responsible_person: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          device_serial_number?: string | null
          entries?: Json
          id?: string
          pdf_uri?: string | null
          project_id: string
          responsible_person?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          device_serial_number?: string | null
          entries?: Json
          id?: string
          pdf_uri?: string | null
          project_id?: string
          responsible_person?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breathalyzer_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          created_at: string
          date_time: string
          id: string
          inspector_name: string
          inspector_signature: string | null
          participants: Json
          project_id: string
          status: string
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_time: string
          id?: string
          inspector_name?: string
          inspector_signature?: string | null
          participants?: Json
          project_id: string
          status?: string
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_time?: string
          id?: string
          inspector_name?: string
          inspector_signature?: string | null
          participants?: Json
          project_id?: string
          status?: string
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_platform_inspections: {
        Row: {
          address: string | null
          cargo: Json
          company: string | null
          completed_at: string | null
          created_at: string
          floor_zone: string | null
          front_guardrail: string | null
          guardrail_height: string | null
          id: string
          inspection_date: string
          inspector_name: string | null
          items: Json
          platform_color_desc: string | null
          platform_length_m: number | null
          platform_type_model: string | null
          platform_width_m: number | null
          project_id: string
          side_guardrail: string | null
          signatures: Json
          status: string
          summary_photos: Json
          template_id: string | null
          updated_at: string
          user_id: string
          verdict: string | null
          verdict_comment: string | null
        }
        Insert: {
          address?: string | null
          cargo?: Json
          company?: string | null
          completed_at?: string | null
          created_at?: string
          floor_zone?: string | null
          front_guardrail?: string | null
          guardrail_height?: string | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          platform_color_desc?: string | null
          platform_length_m?: number | null
          platform_type_model?: string | null
          platform_width_m?: number | null
          project_id: string
          side_guardrail?: string | null
          signatures?: Json
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
          verdict_comment?: string | null
        }
        Update: {
          address?: string | null
          cargo?: Json
          company?: string | null
          completed_at?: string | null
          created_at?: string
          floor_zone?: string | null
          front_guardrail?: string | null
          guardrail_height?: string | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          platform_color_desc?: string | null
          platform_length_m?: number | null
          platform_type_model?: string | null
          platform_width_m?: number | null
          project_id?: string
          side_guardrail?: string | null
          signatures?: Json
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
          verdict_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_platform_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_platform_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          conclusion_text: string | null
          generated_at: string
          id: string
          inspection_id: string
          is_safe_for_use: boolean | null
          params: Json
          pdf_hash: string | null
          pdf_url: string
          template_id: string
          user_id: string
        }
        Insert: {
          conclusion_text?: string | null
          generated_at?: string
          id?: string
          inspection_id: string
          is_safe_for_use?: boolean | null
          params?: Json
          pdf_hash?: string | null
          pdf_url: string
          template_id: string
          user_id: string
        }
        Update: {
          conclusion_text?: string | null
          generated_at?: string
          id?: string
          inspection_id?: string
          is_safe_for_use?: boolean | null
          params?: Json
          pdf_hash?: string | null
          pdf_url?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      excavator_inspections: {
        Row: {
          cabin_items: Json
          completed_at: string | null
          created_at: string
          department: string | null
          engine_items: Json
          id: string
          inspection_date: string
          inspector_name: string | null
          inspector_position: string | null
          inspector_signature: string | null
          inventory_number: string | null
          last_inspection_date: string | null
          machine_specs: Json
          maintenance_items: Json
          moto_hours: number | null
          notes: string | null
          project_id: string
          project_name: string | null
          registration_number: string | null
          safety_items: Json
          serial_number: string | null
          status: string
          summary_photos: Json
          template_id: string | null
          undercarriage_items: Json
          updated_at: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          cabin_items?: Json
          completed_at?: string | null
          created_at?: string
          department?: string | null
          engine_items?: Json
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          inspector_position?: string | null
          inspector_signature?: string | null
          inventory_number?: string | null
          last_inspection_date?: string | null
          machine_specs?: Json
          maintenance_items?: Json
          moto_hours?: number | null
          notes?: string | null
          project_id: string
          project_name?: string | null
          registration_number?: string | null
          safety_items?: Json
          serial_number?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          undercarriage_items?: Json
          updated_at?: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          cabin_items?: Json
          completed_at?: string | null
          created_at?: string
          department?: string | null
          engine_items?: Json
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          inspector_position?: string | null
          inspector_signature?: string | null
          inventory_number?: string | null
          last_inspection_date?: string | null
          machine_specs?: Json
          maintenance_items?: Json
          moto_hours?: number | null
          notes?: string | null
          project_id?: string
          project_name?: string | null
          registration_number?: string | null
          safety_items?: Json
          serial_number?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          undercarriage_items?: Json
          updated_at?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excavator_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excavator_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      fall_protection_inspections: {
        Row: {
          address: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          device_data: Json
          devices: Json
          id: string
          inspection_date: string
          inspection_type: string | null
          next_inspection_date: string | null
          project_id: string
          safety_leader_name: string | null
          safety_leader_phone: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          device_data?: Json
          devices?: Json
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          next_inspection_date?: string | null
          project_id: string
          safety_leader_name?: string | null
          safety_leader_phone?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          device_data?: Json
          devices?: Json
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          next_inspection_date?: string | null
          project_id?: string
          safety_leader_name?: string | null
          safety_leader_phone?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fall_protection_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fall_protection_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      forklift_inspections: {
        Row: {
          address: string | null
          brand_model: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          engine_type: string | null
          id: string
          inspection_date: string
          inspector_name: string | null
          inventory_number: string | null
          items: Json
          notes: string | null
          project_id: string
          qual_doc_path: string | null
          signer_name: string | null
          signer_phone: string | null
          signer_position: string | null
          signer_signature: string | null
          status: string
          summary_photos: Json
          template_id: string | null
          updated_at: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          address?: string | null
          brand_model?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          engine_type?: string | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          inventory_number?: string | null
          items?: Json
          notes?: string | null
          project_id: string
          qual_doc_path?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_position?: string | null
          signer_signature?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          address?: string | null
          brand_model?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          engine_type?: string | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          inventory_number?: string | null
          items?: Json
          notes?: string | null
          project_id?: string
          qual_doc_path?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_position?: string | null
          signer_signature?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forklift_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forklift_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      general_equipment_inspections: {
        Row: {
          act_number: string | null
          activity_type: string | null
          address: string | null
          completed_at: string | null
          conclusion: string | null
          created_at: string
          department: string | null
          equipment: Json
          id: string
          inspection_date: string
          inspection_type: string | null
          inspector_name: string | null
          inspector_signature: string | null
          object_name: string | null
          project_id: string
          signer_name: string | null
          signer_role: string | null
          signer_role_custom: string | null
          status: string
          summary_photos: Json
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          act_number?: string | null
          activity_type?: string | null
          address?: string | null
          completed_at?: string | null
          conclusion?: string | null
          created_at?: string
          department?: string | null
          equipment?: Json
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector_name?: string | null
          inspector_signature?: string | null
          object_name?: string | null
          project_id: string
          signer_name?: string | null
          signer_role?: string | null
          signer_role_custom?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          act_number?: string | null
          activity_type?: string | null
          address?: string | null
          completed_at?: string | null
          conclusion?: string | null
          created_at?: string
          department?: string | null
          equipment?: Json
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector_name?: string | null
          inspector_signature?: string | null
          object_name?: string | null
          project_id?: string
          signer_name?: string | null
          signer_role?: string | null
          signer_role_custom?: string | null
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_equipment_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_equipment_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actions_taken: string
          cause: string
          created_at: string
          date_time: string
          description: string
          id: string
          injured_name: string | null
          injured_role: string | null
          inspector_signature: string | null
          location: string
          pdf_hash: string | null
          pdf_url: string | null
          photos: string[]
          project_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
          witnesses: string[]
        }
        Insert: {
          actions_taken?: string
          cause?: string
          created_at?: string
          date_time?: string
          description?: string
          id?: string
          injured_name?: string | null
          injured_role?: string | null
          inspector_signature?: string | null
          location?: string
          pdf_hash?: string | null
          pdf_url?: string | null
          photos?: string[]
          project_id: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
          witnesses?: string[]
        }
        Update: {
          actions_taken?: string
          cause?: string
          created_at?: string
          date_time?: string
          description?: string
          id?: string
          injured_name?: string | null
          injured_role?: string | null
          inspector_signature?: string | null
          location?: string
          pdf_hash?: string | null
          pdf_url?: string | null
          photos?: string[]
          project_id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          witnesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_attachments: {
        Row: {
          cert_number: string | null
          cert_type: string
          created_at: string
          id: string
          inspection_id: string
          photo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cert_number?: string | null
          cert_type: string
          created_at?: string
          id?: string
          inspection_id: string
          photo_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cert_number?: string | null
          cert_type?: string
          created_at?: string
          id?: string
          inspection_id?: string
          photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_attachments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_at: string | null
          conclusion_photo_paths: string[]
          conclusion_text: string | null
          created_at: string
          department: string | null
          harness_name: string | null
          id: string
          inspector_name: string | null
          inspector_signature: string | null
          is_safe_for_use: boolean | null
          project_id: string
          project_item_id: string | null
          signatories: Json
          status: Database["public"]["Enums"]["questionnaire_status"]
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          conclusion_photo_paths?: string[]
          conclusion_text?: string | null
          created_at?: string
          department?: string | null
          harness_name?: string | null
          id?: string
          inspector_name?: string | null
          inspector_signature?: string | null
          is_safe_for_use?: boolean | null
          project_id: string
          project_item_id?: string | null
          signatories?: Json
          status?: Database["public"]["Enums"]["questionnaire_status"]
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          conclusion_photo_paths?: string[]
          conclusion_text?: string | null
          created_at?: string
          department?: string | null
          harness_name?: string | null
          id?: string
          inspector_name?: string | null
          inspector_signature?: string | null
          is_safe_for_use?: boolean | null
          project_id?: string
          project_item_id?: string | null
          signatories?: Json
          status?: Database["public"]["Enums"]["questionnaire_status"]
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lifting_accessories_inspections: {
        Row: {
          address: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          equipment_type_other: string
          equipment_types: Json
          id: string
          inspection_date: string
          inspector_name: string | null
          items: Json
          manufacturer: string
          marking_status: string | null
          next_inspection_date: string | null
          project_id: string
          removed_rows: Json
          serial_number: string
          signatures: Json
          status: string
          summary_photos: Json
          template_id: string | null
          unit_count: string
          updated_at: string
          user_id: string
          verdict: string | null
          verdict_comment: string
          wll_kg: string
          year_of_manufacture: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          equipment_type_other?: string
          equipment_types?: Json
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          manufacturer?: string
          marking_status?: string | null
          next_inspection_date?: string | null
          project_id: string
          removed_rows?: Json
          serial_number?: string
          signatures?: Json
          status?: string
          summary_photos?: Json
          template_id?: string | null
          unit_count?: string
          updated_at?: string
          user_id: string
          verdict?: string | null
          verdict_comment?: string
          wll_kg?: string
          year_of_manufacture?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          equipment_type_other?: string
          equipment_types?: Json
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          manufacturer?: string
          marking_status?: string | null
          next_inspection_date?: string | null
          project_id?: string
          removed_rows?: Json
          serial_number?: string
          signatures?: Json
          status?: string
          summary_photos?: Json
          template_id?: string | null
          unit_count?: string
          updated_at?: string
          user_id?: string
          verdict?: string | null
          verdict_comment?: string
          wll_kg?: string
          year_of_manufacture?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifting_accessories_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifting_accessories_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_ladder_inspections: {
        Row: {
          address: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          height_m: number | null
          height_unknown: boolean
          id: string
          inspection_date: string
          inspector_name: string | null
          items: Json
          ladder_type: string | null
          ladder_type_unknown: boolean
          max_load_kg: number | null
          max_load_unknown: boolean
          model: string | null
          model_unknown: boolean
          next_inspection_date: string | null
          project_id: string
          signature: Json
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
          verdict: string | null
          verdict_comment: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          height_m?: number | null
          height_unknown?: boolean
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          ladder_type?: string | null
          ladder_type_unknown?: boolean
          max_load_kg?: number | null
          max_load_unknown?: boolean
          model?: string | null
          model_unknown?: boolean
          next_inspection_date?: string | null
          project_id: string
          signature?: Json
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
          verdict_comment?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          height_m?: number | null
          height_unknown?: boolean
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          ladder_type?: string | null
          ladder_type_unknown?: boolean
          max_load_kg?: number | null
          max_load_unknown?: boolean
          model?: string | null
          model_unknown?: boolean
          next_inspection_date?: string | null
          project_id?: string
          signature?: Json
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
          verdict_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_ladder_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_ladder_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          document_type: string
          form_data: Json
          id: string
          pdf_hash: string | null
          pdf_url: string | null
          project_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          form_data?: Json
          id?: string
          pdf_hash?: string | null
          pdf_url?: string | null
          project_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          form_data?: Json
          id?: string
          pdf_hash?: string | null
          pdf_url?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number | null
          bog_order_id: string
          created_at: string
          currency: string | null
          id: string
          raw_callback: Json | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          bog_order_id: string
          created_at?: string
          currency?: string | null
          id?: string
          raw_callback?: Json | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number | null
          bog_order_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          raw_callback?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_signers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          position: string | null
          project_id: string
          role: Database["public"]["Enums"]["signer_role"]
          signature_png_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          project_id: string
          role: Database["public"]["Enums"]["signer_role"]
          signature_png_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["signer_role"]
          signature_png_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_signers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          company_contact_name: string | null
          company_contact_phone: string | null
          company_id_number: string | null
          company_name: string | null
          contact_phone: string | null
          created_at: string
          crew: Json | null
          id: string
          latitude: number | null
          logo: string | null
          longitude: number | null
          name: string
          project_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_contact_name?: string | null
          company_contact_phone?: string | null
          company_id_number?: string | null
          company_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crew?: Json | null
          id?: string
          latitude?: number | null
          logo?: string | null
          longitude?: number | null
          name: string
          project_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_contact_name?: string | null
          company_contact_phone?: string | null
          company_id_number?: string | null
          company_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crew?: Json | null
          id?: string
          latitude?: number | null
          logo?: string | null
          longitude?: number | null
          name?: string
          project_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          created_at: string
          expires_at: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          number: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          number?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          number?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          grid_cols: Json | null
          grid_rows: Json | null
          id: string
          max_val: number | null
          min_val: number | null
          order: number
          section: number
          template_id: string
          title: string
          type: Database["public"]["Enums"]["question_type"]
          unit: string | null
        }
        Insert: {
          grid_cols?: Json | null
          grid_rows?: Json | null
          id?: string
          max_val?: number | null
          min_val?: number | null
          order: number
          section?: number
          template_id: string
          title: string
          type: Database["public"]["Enums"]["question_type"]
          unit?: string | null
        }
        Update: {
          grid_cols?: Json | null
          grid_rows?: Json | null
          id?: string
          max_val?: number | null
          min_val?: number | null
          order?: number
          section?: number
          template_id?: string
          title?: string
          type?: Database["public"]["Enums"]["question_type"]
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_signing_requests: {
        Row: {
          created_at: string
          declined_reason: string | null
          expert_user_id: string
          expires_at: string
          id: string
          inspection_id: string
          last_sent_at: string | null
          pdf_signed_url: string | null
          signature_png_url: string | null
          signed_at: string | null
          signer_name: string
          signer_phone: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          declined_reason?: string | null
          expert_user_id: string
          expires_at?: string
          id?: string
          inspection_id: string
          last_sent_at?: string | null
          pdf_signed_url?: string | null
          signature_png_url?: string | null
          signed_at?: string | null
          signer_name: string
          signer_phone: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          declined_reason?: string | null
          expert_user_id?: string
          expires_at?: string
          id?: string
          inspection_id?: string
          last_sent_at?: string | null
          pdf_signed_url?: string | null
          signature_png_url?: string | null
          signed_at?: string | null
          signer_name?: string
          signer_phone?: string
          signer_role?: Database["public"]["Enums"]["signer_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_signing_requests_expert_user_id_fkey"
            columns: ["expert_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_signing_requests_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          pdf_hash: string | null
          pdf_url: string | null
          project_id: string
          slides: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_hash?: string | null
          pdf_url?: string | null
          project_id: string
          slides?: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_hash?: string | null
          pdf_url?: string | null
          project_id?: string
          slides?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_net_inspections: {
        Row: {
          address: string | null
          anchor_point_count: number | null
          cell_side: string | null
          certificate: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          edge_rope_count: number | null
          id: string
          inspection_date: string
          inspector_name: string | null
          items: Json
          load_test_rows: Json
          manufacturer: string | null
          net_size: string | null
          post_anchor_count: number | null
          post_count: number | null
          post_size: string | null
          post_test_items: Json
          project_id: string
          qual_doc_path: string | null
          signatures: Json
          status: string
          summary_photos: Json
          template_id: string | null
          updated_at: string
          user_id: string
          verdict: string | null
          verdict_comment: string | null
          working_distance: string | null
        }
        Insert: {
          address?: string | null
          anchor_point_count?: number | null
          cell_side?: string | null
          certificate?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          edge_rope_count?: number | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          load_test_rows?: Json
          manufacturer?: string | null
          net_size?: string | null
          post_anchor_count?: number | null
          post_count?: number | null
          post_size?: string | null
          post_test_items?: Json
          project_id: string
          qual_doc_path?: string | null
          signatures?: Json
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
          verdict_comment?: string | null
          working_distance?: string | null
        }
        Update: {
          address?: string | null
          anchor_point_count?: number | null
          cell_side?: string | null
          certificate?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          edge_rope_count?: number | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          items?: Json
          load_test_rows?: Json
          manufacturer?: string | null
          net_size?: string | null
          post_anchor_count?: number | null
          post_count?: number | null
          post_size?: string | null
          post_test_items?: Json
          project_id?: string
          qual_doc_path?: string | null
          signatures?: Json
          status?: string
          summary_photos?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
          verdict_comment?: string | null
          working_distance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_net_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_net_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          google_event_id: string | null
          id: string
          interval_days: number
          last_inspected_at: string | null
          next_due_at: string | null
          project_item_id: string
        }
        Insert: {
          created_at?: string
          google_event_id?: string | null
          id?: string
          interval_days?: number
          last_inspected_at?: string | null
          next_due_at?: string | null
          project_item_id: string
        }
        Update: {
          created_at?: string
          google_event_id?: string | null
          id?: string
          interval_days?: number
          last_inspected_at?: string | null
          next_due_at?: string | null
          project_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          full_name: string
          id: string
          inspection_id: string
          person_name: string | null
          phone: string | null
          position: string | null
          signature_png_url: string | null
          signed_at: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          status: Database["public"]["Enums"]["signature_status"]
        }
        Insert: {
          full_name: string
          id?: string
          inspection_id: string
          person_name?: string | null
          phone?: string | null
          position?: string | null
          signature_png_url?: string | null
          signed_at?: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          status?: Database["public"]["Enums"]["signature_status"]
        }
        Update: {
          full_name?: string
          id?: string
          inspection_id?: string
          person_name?: string | null
          phone?: string | null
          position?: string | null
          signature_png_url?: string | null
          signed_at?: string
          signer_role?: Database["public"]["Enums"]["signer_role"]
          status?: Database["public"]["Enums"]["signature_status"]
        }
        Relationships: [
          {
            foreignKeyName: "signatures_questionnaire_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_system: boolean
          name: string
          owner_id: string | null
          required_qualifications: string[]
          required_signer_roles: Database["public"]["Enums"]["signer_role"][]
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          owner_id?: string | null
          required_qualifications?: string[]
          required_signer_roles?: Database["public"]["Enums"]["signer_role"][]
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          owner_id?: string | null
          required_qualifications?: string[]
          required_signer_roles?: Database["public"]["Enums"]["signer_role"][]
        }
        Relationships: [
          {
            foreignKeyName: "templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bog_card_token: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          pdf_count: number
          saved_signature_url: string | null
          subscription_cancelled_at: string | null
          subscription_expires_at: string | null
          subscription_status: string
          tc_accepted_at: string | null
          tc_accepted_version: string | null
          updated_at: string
        }
        Insert: {
          bog_card_token?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          pdf_count?: number
          saved_signature_url?: string | null
          subscription_cancelled_at?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          tc_accepted_at?: string | null
          tc_accepted_version?: string | null
          updated_at?: string
        }
        Update: {
          bog_card_token?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          pdf_count?: number
          saved_signature_url?: string | null
          subscription_cancelled_at?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          tc_accepted_at?: string | null
          tc_accepted_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_subscription: { Args: { user_id: string }; Returns: Json }
      decline_signature: {
        Args: { p_reason: string; p_token: string }
        Returns: Json
      }
      get_signing_request: { Args: { p_token: string }; Returns: Json }
      increment_pdf_count: { Args: { user_id: string }; Returns: Json }
      submit_signature: {
        Args: { p_storage_path: string; p_token: string }
        Returns: Json
      }
      user_owns_project: { Args: { pid: string }; Returns: boolean }
    }
    Enums: {
      question_type:
        | "yesno"
        | "measure"
        | "component_grid"
        | "freetext"
        | "photo_upload"
      questionnaire_status: "draft" | "completed"
      signature_status: "signed" | "not_present"
      signer_role:
        | "expert"
        | "xaracho_supervisor"
        | "xaracho_assembler"
        | "other"
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
      question_type: [
        "yesno",
        "measure",
        "component_grid",
        "freetext",
        "photo_upload",
      ],
      questionnaire_status: ["draft", "completed"],
      signature_status: ["signed", "not_present"],
      signer_role: [
        "expert",
        "xaracho_supervisor",
        "xaracho_assembler",
        "other",
      ],
    },
  },
} as const
