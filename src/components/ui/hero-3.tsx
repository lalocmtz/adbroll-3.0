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
  images?: string[];
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
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className={cn(
      "px-7 py-3.5 rounded-full font-bold transition-all duration-200 focus:outline-none",
      variant === "primary" 
        ? "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90" 
        : "bg-white text-foreground border border-border hover:bg-muted"
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
        "relative w-full min-h-screen overflow-hidden flex flex-col items-center justify-start text-center px-4 bg-background",
        className
      )}
    >
      {/* Main content - centered */}
      <div className="z-10 flex flex-col items-center max-w-[960px] mx-auto pt-24 md:pt-32">
        {/* Tagline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-4 inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
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
          transition={{ delay: 0.35 }}
          className="mt-5 md:mt-6 max-w-[720px] text-base md:text-lg lg:text-xl text-muted-foreground"
        >
          {description}
        </motion.p>

        {/* Call to Action Buttons */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-8"
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

      {/* Animated Image Marquee - Large cards with infinite scroll */}
      <div 
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden"
        style={{
          height: '55vh',
          maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <motion.div
          className="flex gap-4 md:gap-6"
          animate={{
            x: ["-50%", "0%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 80,
              ease: "linear",
            },
          }}
        >
          {heroImages.map((src, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 transition-transform duration-300 hover:scale-[1.02] hover:-translate-y-2"
              style={{
                width: 'clamp(280px, 22vw, 380px)',
                height: 'clamp(420px, 48vh, 620px)',
                transform: `rotate(${(index % 2 === 0 ? -1 : 1.5)}deg)`,
              }}
            >
              <img
                src={src}
                alt={`Showcase image ${index + 1}`}
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
