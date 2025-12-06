"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  ctaSecondaryText?: string;
  images: string[];
  className?: string;
  onCtaClick?: () => void;
  onCtaSecondaryClick?: () => void;
}

const ActionButton = ({ 
  children, 
  onClick, 
  variant = "primary" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "px-8 py-4 rounded-full font-semibold shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-75",
      variant === "primary" 
        ? "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary btn-glow" 
        : "bg-white text-foreground border border-border hover:bg-muted focus:ring-muted"
    )}
  >
    {children}
  </motion.button>
);

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  ctaSecondaryText,
  images,
  className,
  onCtaClick,
  onCtaSecondaryClick,
}) => {
  const FADE_IN_ANIMATION_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } },
  };

  // Duplicate images for a seamless loop
  const duplicatedImages = [...images, ...images];

  return (
    <section
      className={cn(
        "relative w-full min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center text-center px-4 pt-24 pb-8",
        className
      )}
    >
      {/* Background glows */}
      <div className="landing-hero-glow landing-hero-glow-pink" />
      <div className="landing-hero-glow landing-hero-glow-blue" />

      <div className="z-10 flex flex-col items-center max-w-4xl mx-auto">
        {/* Tagline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-6 inline-block rounded-full border border-border bg-card/50 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm"
        >
          {tagline}
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight"
        >
          {typeof title === 'string' ? (
            title.split(" ").map((word, i) => (
              <motion.span
                key={i}
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))
          ) : (
            <motion.span variants={FADE_IN_ANIMATION_VARIANTS}>
              {title}
            </motion.span>
          )}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground"
        >
          {description}
        </motion.p>

        {/* Call to Action Buttons */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          <ActionButton onClick={onCtaClick} variant="primary">
            {ctaText}
          </ActionButton>
          {ctaSecondaryText && (
            <ActionButton onClick={onCtaSecondaryClick} variant="secondary">
              {ctaSecondaryText}
            </ActionButton>
          )}
        </motion.div>
      </div>

      {/* Animated Image Marquee */}
      <div className="absolute bottom-0 left-0 w-full h-[35%] md:h-[40%] [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]">
        <motion.div
          className="flex gap-4 absolute bottom-8"
          animate={{
            x: ["-50%", "0%"],
            transition: {
              ease: "linear",
              duration: 30,
              repeat: Infinity,
            },
          }}
        >
          {duplicatedImages.map((src, index) => (
            <div
              key={index}
              className="relative aspect-[9/16] h-48 md:h-64 flex-shrink-0"
              style={{
                transform: `rotate(${(index % 2 === 0 ? -3 : 4)}deg)`,
              }}
            >
              <img
                src={src}
                alt={`Video viral ${index + 1}`}
                className="w-full h-full object-cover rounded-2xl shadow-xl border border-border/50"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-2xl">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-0 h-0 border-l-[16px] border-l-primary border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
