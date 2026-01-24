import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, Plus, Lock } from "lucide-react";
import type { Department, AppRole, Profile } from "@/types/database";
import { ManagerSelect } from "@/components/directory/ManagerSelect";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onMemberAdded: () => void;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "contractor", label: "Contractor" },
  { value: "department_manager", label: "Department Manager" },
  { value: "training_manager", label: "Training Manager" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "super_admin", label: "Super Admin" },
];

export function AddMemberDialog({
  open,
  onOpenChange,
  departments,
  onMemberAdded,
}: AddMemberDialogProps) {
  const { canViewSensitiveData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Profile[]>([]);
  
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [role, setRole] = useState<AppRole>("employee");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [managerId, setManagerId] = useState<string | null>(null);
  
  // Sensitive fields (HR/Super Admin only)
  const [dateHired, setDateHired] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  
  // Emergency contact fields
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setDepartmentId("");
    setRole("employee");
    setJobTitle("");
    setPhone("");
    setLocation("");
    setManagerId(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    // Sensitive fields
    setDateHired("");
    setDateOfBirth("");
    setPersonalEmail("");
    setPersonalPhone("");
    // Emergency contacts
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setEmergencyContactRelationship("");
  };

  // Fetch employees for manager dropdown
  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("*, department:departments!profiles_department_id_fkey(*)")
          .eq("is_active", true)
          .order("first_name");
        
        if (data) {
          setEmployees(data as unknown as Profile[]);
        }
      };
      fetchEmployees();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Use edge function to create user (keeps admin logged in)
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: {
          email,
          password,
          firstName,
          lastName,
          role,
          departmentId: departmentId || null,
          jobTitle: jobTitle || null,
          phone: phone || null,
          location: location || null,
          managerId: managerId || null,
          // Sensitive fields (HR/Super Admin only)
          ...(canViewSensitiveData() && {
            dateHired: dateHired || null,
            dateOfBirth: dateOfBirth || null,
            personalEmail: personalEmail || null,
            personalPhone: personalPhone || null,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            emergencyContactRelationship: emergencyContactRelationship || null,
          }),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const userId = data.userId;

      // Upload avatar if provided (after user is created)
      if (avatarFile && userId) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

          // Update avatar URL via direct update (admin has permission)
          await supabase
            .from("profiles")
            .update({ avatar_url: publicUrlData.publicUrl })
            .eq("user_id", userId);
        } else {
          console.error("Avatar upload error:", uploadError);
        }
      }

      toast.success(`${firstName} ${lastName} has been added to the team!`);
      onOpenChange(false);
      onMemberAdded();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create team member");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Team Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                  {firstName?.[0] || ""}
                  {lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@company.com"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />
          </div>

          {/* Department and Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reports To (Manager) */}
          <div className="space-y-2">
            <Label>Reports To</Label>
            <ManagerSelect
              value={managerId}
              onValueChange={setManagerId}
              employees={employees}
              placeholder="Select manager"
            />
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer"
            />
          </div>

          {/* Phone and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>

          {/* Sensitive HR Fields - Only for HR/Super Admin */}
          {canViewSensitiveData() && (
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">HR Information</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateHired">Date Hired</Label>
                  <Input
                    id="dateHired"
                    type="date"
                    value={dateHired}
                    onChange={(e) => setDateHired(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="personal@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalPhone">Personal Phone</Label>
                  <Input
                    id="personalPhone"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-t pt-4 mt-4">
                <span className="text-sm font-medium text-muted-foreground">Emergency Contact</span>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                    <Input
                      id="emergencyContactRelationship"
                      value={emergencyContactRelationship}
                      onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                      placeholder="Spouse, Parent, etc."
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Member
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
