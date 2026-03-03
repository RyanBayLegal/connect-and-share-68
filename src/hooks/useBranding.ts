import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingSettings {
  id: string;
  company_name: string;
  company_slogan: string;
  logo_url: string | null;
}

const defaultBranding: BrandingSettings = {
  id: "",
  company_name: "Bay Legal, PC",
  company_slogan: "Your Knowledge Base for Policies, Resources, and Support",
  logo_url: null,
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from("branding_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setBranding(data as BrandingSettings);
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { branding, isLoading, refetch: fetchBranding };
}
