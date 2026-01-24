-- Add sensitive profile fields for HR and Super Admin visibility
ALTER TABLE public.profiles 
ADD COLUMN personal_email text,
ADD COLUMN personal_phone text;