import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

export function BrandingSettingsCard() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companySlogan, setCompanySlogan] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    const { data } = await supabase
      .from("branding_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setBrandingId(data.id);
      setCompanyName(data.company_name);
      setCompanySlogan(data.company_slogan);
      setLogoUrl(data.logo_url);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        company_name: companyName,
        company_slogan: companySlogan,
        logo_url: logoUrl,
      };

      if (brandingId) {
        const { error } = await supabase
          .from("branding_settings")
          .update(payload)
          .eq("id", brandingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("branding_settings")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setBrandingId(data.id);
      }
      toast.success("Branding updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update branding");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `branding/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast.success("Logo uploaded! Click Save to apply.");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Branding
        </CardTitle>
        <CardDescription>
          Customize your company name, slogan, and logo displayed across the portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-6 mb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-zinc-500" />
                )}
              </div>
              <label
                htmlFor="logo-upload"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-3 w-3" />
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
            <div>
              <h3 className="font-medium text-sm">Company Logo</h3>
              <p className="text-xs text-muted-foreground">Upload your company logo (PNG, SVG, WebP)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companySlogan">Company Slogan / Tagline</Label>
            <Input
              id="companySlogan"
              value={companySlogan}
              onChange={(e) => setCompanySlogan(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
