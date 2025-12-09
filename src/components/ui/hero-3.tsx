"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Import result images for hero
import result1 from "@/assets/result-1.png";
import result2 from "@/assets/result-2.png";
import result3 from "@/assets/result-3.png";
import result4 from "@/assets/result-4.png";

// Static result images
const HERO_CARDS = [result1, result2, result3, result4];

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
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full sm:w-auto px-6 md:px-7 py-3 md:py-3.5 rounded-full font-semibold md:font-bold text-sm md:text-base transition-all duration-200 focus:outline-none",
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

  // Duplicate for seamless infinite scroll
  const heroImages = [...HERO_CARDS, ...HERO_CARDS, ...HERO_CARDS];

  return (
    <section
      className={cn(
        "relative w-full min-h-[70vh] md:min-h-screen overflow-hidden flex flex-col items-center justify-start text-center px-3 md:px-4 bg-background",
        className
      )}
    >
      {/* Main content - compact on mobile */}
      <div className="z-10 flex flex-col items-center max-w-[960px] mx-auto pt-14 md:pt-32 px-1">
        {/* Tagline - compact on mobile */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-2 md:mb-4 inline-block rounded-full border border-border bg-card px-2.5 md:px-4 py-1 md:py-2 text-[10px] md:text-sm font-medium text-muted-foreground"
        >
          {tagline}
        </motion.div>

        {/* Main Title - compact on mobile */}
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
          className="text-xl sm:text-2xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight"
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

        {/* Description - compact on mobile */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.35 }}
          className="mt-2 md:mt-6 max-w-[720px] text-xs md:text-lg lg:text-xl text-muted-foreground px-4 md:px-2"
        >
          {description}
        </motion.p>

        {/* Call to Action Buttons - compact on mobile */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-3 md:mt-8 w-full sm:w-auto px-6 sm:px-0"
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

      {/* Animated Image Marquee - larger on mobile, closer to content */}
      <div 
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden"
        style={{
          height: 'clamp(38vh, 42vh, 48vh)',
          maskImage: 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
        }}
      >
        <motion.div
          className="flex"
          style={{ gap: '16px' }}
          animate={{
            x: ["-50%", "0%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 60,
              ease: "linear",
            },
          }}
        >
          {heroImages.map((src, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 transition-transform duration-300 hover:scale-[1.02] hover:-translate-y-2"
              style={{
                width: 'clamp(160px, 28vw, 380px)',
                height: 'clamp(200px, 32vh, 380px)',
                transform: `rotate(${(index % 2 === 0 ? -1 : 1.5)}deg)`,
              }}
            >
              <img
                src={src}
                alt={`Resultado ${index + 1}`}
                className="w-full h-full object-contain drop-shadow-2xl rounded-2xl border border-border/10"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
