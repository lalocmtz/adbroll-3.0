-- Migración 1: Agregar 'brand' al enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'brand';