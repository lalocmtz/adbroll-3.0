"use client";

import * as React from "react";
import { motion, Variants } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeVideoPlayer } from "@/components/NativeVideoPlayer";

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

  // Detect if videoUrl is a YouTube URL or a native video
  const isYouTubeUrl = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={cn(
        "w-full max-w-4xl mx-auto bg-card text-card-foreground border rounded-2xl shadow-sm p-8 overflow-hidden",
        className
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Title and Checklist */}
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <ul className="mt-6 grid grid-cols-1 gap-y-4">
            {items.map((item) => (
              <motion.li key={item.id} variants={itemVariants} className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="ml-3 text-sm font-medium">{item.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Right Side: Video Player */}
        <motion.div variants={itemVariants} className="w-full">
          {isYouTubeUrl ? (
            // YouTube embed fallback
            <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] aspect-video">
              <iframe
                src={videoUrl}
                title="Video Guide"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            // Native video player for MP4s
            <NativeVideoPlayer
              videoUrl={videoUrl}
              posterUrl={videoThumbnailUrl}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
