"use client";

import * as React from "react";
import { motion, Variants } from "framer-motion";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
interface ChecklistItem {
  id: number | string;
  text: string;
}
export interface OnboardingChecklistProps {
  title: string;
  description: string;
  items: ChecklistItem[];
  videoThumbnailUrl: string;
  videoUrl: string;
  className?: string;
}
export const OnboardingChecklist = ({
  title,
  description,
  items,
  videoThumbnailUrl,
  videoUrl,
  className
}: OnboardingChecklistProps) => {
  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      x: -20
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };
  return;
};