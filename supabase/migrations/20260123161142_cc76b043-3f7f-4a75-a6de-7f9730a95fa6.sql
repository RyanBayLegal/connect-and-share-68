-- Add training_manager to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'training_manager';