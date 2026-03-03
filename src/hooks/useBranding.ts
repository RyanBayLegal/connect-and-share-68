import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  id: string;
  company_name: string;
  company_slogan: string;
  logo_url: string | null;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
}

const defaultBranding: BrandingSettings = {
  id: "",
  company_name: "Bay Legal, PC",
  company_slogan: "Your Knowledge Base for Policies, Resources, and Support",
  logo_url: null,
  contact_phone: "(510) 250-5270",
  contact_email: "info@baylegal.com",
  contact_address: "1735 Telegraph Ave\nOakland, CA 94612",
};

const BRANDING_QUERY_KEY = ["branding-settings"];

async function fetchBrandingSettings(): Promise<BrandingSettings> {
  const { data, error } = await supabase
    .from("branding_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data && !error) {
    return {
      id: data.id,
      company_name: data.company_name,
      company_slogan: data.company_slogan,
      logo_url: data.logo_url,
      contact_phone: (data as any).contact_phone || defaultBranding.contact_phone,
      contact_email: (data as any).contact_email || defaultBranding.contact_email,
      contact_address: (data as any).contact_address || defaultBranding.contact_address,
    };
  }

  return defaultBranding;
}

export function useBranding() {
  const { data: branding = defaultBranding, isLoading } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBrandingSettings,
    staleTime: 1000 * 60 * 5,
  });

  return { branding, isLoading };
}

export function useInvalidateBranding() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
}
