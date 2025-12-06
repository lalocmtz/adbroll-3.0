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
        ? "bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40" 
        : "bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20"
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
        "relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-center px-4",
        className
      )}
      style={{ backgroundColor: '#0B0B0B' }}
    >
      {/* Ground glow under cards for floating effect */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-[1]"
        style={{
          bottom: 'clamp(36vh, 40vh, 45vh)',
          height: '96px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.4), rgba(0,0,0,0))',
          filter: 'blur(24px)',
        }}
      />

      {/* Main content - centered */}
      <div className="z-10 flex flex-col items-center max-w-[960px] mx-auto">
        {/* Tagline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-3 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs md:text-sm font-medium backdrop-blur-md"
          style={{ color: 'rgba(255,255,255,0.68)' }}
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
          className="font-black tracking-tight text-white leading-[0.98]"
          style={{ 
            fontSize: 'clamp(40px, 6vw, 88px)',
            letterSpacing: '-0.02em',
          }}
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
          className="mt-5 md:mt-6 max-w-[720px] text-base md:text-lg lg:text-xl"
          style={{ color: 'rgba(255,255,255,0.68)' }}
        >
          {description}
        </motion.p>

        {/* Call to Action Buttons */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-7"
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

      {/* Animated Image Marquee - Tightly spaced floating cards */}
      <div 
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden"
        style={{
          height: 'clamp(36vh, 40vh, 45vh)',
          maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
        }}
      >
        <motion.div
          className="flex px-1"
          style={{ gap: '8px' }}
          animate={{
            x: ["-100%", "0%"],
            transition: {
              ease: "linear",
              duration: 32,
              repeat: Infinity,
            },
          }}
        >
          {heroImages.map((src, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 rounded-[20px] overflow-hidden transition-transform duration-200 hover:-translate-y-1"
              style={{
                aspectRatio: '3/4',
                height: 'clamp(176px, 22vh, 288px)',
                transform: `rotate(${(index % 2 === 0 ? -1.5 : 2.5)}deg)`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                willChange: 'transform',
              }}
            >
              <img
                src={src}
                alt={`Showcase image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
