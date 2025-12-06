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
  className,
}: OnboardingChecklistProps) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className={cn(
        "w-full max-w-5xl mx-auto bg-card text-card-foreground border rounded-2xl shadow-lg p-8 md:p-10 overflow-hidden",
        className
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side: Title and Checklist */}
        <div className="flex flex-col">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-3 text-muted-foreground text-base">{description}</p>
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <motion.li key={item.id} variants={itemVariants} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base font-medium text-foreground">{item.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Right Side: Video Thumbnail */}
        <motion.div
          variants={itemVariants}
          className="relative group rounded-xl overflow-hidden cursor-pointer w-full aspect-video shadow-md"
        >
          <Dialog>
            <DialogTrigger asChild>
              <div className="relative w-full h-full">
                <img
                  src={videoThumbnailUrl}
                  alt="Video guide thumbnail"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors duration-300 group-hover:bg-black/40">
                  <PlayCircle className="h-16 w-16 text-white/90 transform transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 border-0 bg-black">
              <div className="aspect-video">
                <iframe
                  src={videoUrl}
                  title="Video Tutorial AdBroll"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                ></iframe>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </motion.div>
  );
};
