-- Migration: Add self-validation type and reward_points for demo missions
-- This enables auto-validated missions that award points immediately

-- Add 'self' to mission_validation_type enum
ALTER TYPE mission_validation_type ADD VALUE IF NOT EXISTS 'self';

-- Add reward_points column to missions table
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

-- Add reward_points column to mission_templates table  
ALTER TABLE mission_templates
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

-- Comment
COMMENT ON COLUMN missions.reward_points IS 'Mission points awarded upon successful completion (used with self-validation)';
COMMENT ON COLUMN mission_templates.reward_points IS 'Mission points awarded upon successful completion (template default)';
