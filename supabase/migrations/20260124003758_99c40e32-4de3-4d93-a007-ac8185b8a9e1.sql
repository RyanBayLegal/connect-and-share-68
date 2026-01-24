-- First migration: Add hr_manager role and emergency contact fields
-- Add hr_manager role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_manager';

-- Add emergency contact fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;