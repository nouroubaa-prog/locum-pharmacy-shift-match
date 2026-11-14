import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Profile = T["profiles"]["Row"];
export type LocumProfile = T["locum_profiles"]["Row"];
export type Pharmacy = T["pharmacies"]["Row"];
export type Shift = T["shifts"]["Row"];
export type ShiftContact = T["shift_contacts"]["Row"];
export type Application = T["applications"]["Row"];
export type Report = T["reports"]["Row"];
export type Notification = T["notifications"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type ShiftStatus = Database["public"]["Enums"]["shift_status"];
