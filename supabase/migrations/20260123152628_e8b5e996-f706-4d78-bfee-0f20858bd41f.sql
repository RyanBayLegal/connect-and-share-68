-- Add manager_id column to departments table for explicit department manager assignment
ALTER TABLE public.departments 
ADD COLUMN manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;