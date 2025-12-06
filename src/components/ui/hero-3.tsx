"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Import hero card images
import heroCard1 from "@/assets/hero-card-1.png";
import heroCard2 from "@/assets/hero-card-2.png";
import heroCard3 from "@/assets/hero-card-3.png";
import heroCard4 from "@/assets/hero-card-4.png";
import heroCard5 from "@/assets/hero-card-5.png";
import heroCard6 from "@/assets/hero-card-6.png";
import heroCard7 from "@/assets/hero-card-7.png";
import heroCard8 from "@/assets/hero-card-8.png";

// Static hero card images
const HERO_CARDS = [heroCard1, heroCard2, heroCard3, heroCard4, heroCard5, heroCard6, heroCard7, heroCard8];

interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  ctaSecondaryText?: string;
  images?: string[]; // Optional - will use static cards if not provided
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

  // Use static hero cards - duplicate for seamless infinite scroll
  const heroImages = [...HERO_CARDS, ...HERO_CARDS, ...HERO_CARDS];

  return (
    <section
      className={cn(
        "relative w-full min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center text-center px-4",
        className
      )}
    >
      {/* Background glows */}
      <div className="landing-hero-glow landing-hero-glow-pink" />
      <div className="landing-hero-glow landing-hero-glow-blue" />

      {/* Main content - centered vertically */}
      <div className="z-10 flex flex-col items-center max-w-4xl mx-auto pt-20 pb-8">
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

      {/* Animated Image Marquee - Floating cards on white background */}
      <div className="absolute bottom-0 left-0 w-full h-[520px] md:h-[640px] flex items-end justify-center overflow-hidden bg-white">
        <motion.div
          className="flex gap-8 pb-6"
          animate={{
            x: ["-33.33%", "0%"],
            transition: {
              ease: "linear",
              duration: 100,
              repeat: Infinity,
            },
          }}
        >
          {heroImages.map((src, index) => (
            <div
              key={index}
              className="relative w-[300px] md:w-[360px] h-[480px] md:h-[580px] flex-shrink-0 transition-transform hover:scale-[1.02]"
              style={{
                transform: `rotate(${(index % 2 === 0 ? -1.5 : 2)}deg)`,
              }}
            >
              <img
                src={src}
                alt={`Video viral ${index + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
