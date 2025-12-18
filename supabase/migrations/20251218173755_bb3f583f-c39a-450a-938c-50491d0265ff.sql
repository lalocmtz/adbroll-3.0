-- Add tracking columns for automated emails
ALTER TABLE public.email_captures 
ADD COLUMN IF NOT EXISTS followup_sent_at timestamp with time zone DEFAULT NULL;

-- Add tracking for profile email reminders
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reminder_email_sent_at timestamp with time zone DEFAULT NULL;

-- Add renewal reminder tracking to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at timestamp with time zone DEFAULT NULL;