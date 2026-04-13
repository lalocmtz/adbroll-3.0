"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Feature {
  step: string
  title?: string
  content: string
  image: string
}

interface FeatureStepsProps {
  features: Feature[]
  className?: string
  title?: string
  subtitle?: string
  autoPlayInterval?: number
  imageHeight?: string
}

export function FeatureSteps({
  features,
  className,
  title = "How to get Started",
  subtitle,
  autoPlayInterval = 3000,
  imageHeight = "h-[400px]",
}: FeatureStepsProps) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      if (progress < 100) {
        setProgress((prev) => prev + 100 / (autoPlayInterval / 100))
      } else {
        setCurrentFeature((prev) => (prev + 1) % features.length)
        setProgress(0)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [progress, features.length, autoPlayInterval])

  return (
    <div className={cn("p-4 md:p-12", className)}>
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-center text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-center text-muted-foreground text-sm md:text-lg mb-6 md:mb-10 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}

        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-10">
          <div className="order-2 md:order-1 space-y-3 md:space-y-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={cn(
                  "flex items-start gap-4 md:gap-8 cursor-pointer p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300",
                  index === currentFeature ? "bg-primary/5" : "hover:bg-muted/50"
                )}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: index === currentFeature ? 1 : 0.5 }}
                transition={{ duration: 0.5 }}
                onClick={() => {
                  setCurrentFeature(index)
                  setProgress(0)
                }}
              >
                <motion.div
                  className={cn(
                    "w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-300",
                    index === currentFeature
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "bg-muted border-border text-muted-foreground",
                  )}
                >
                  {index < currentFeature ? (
                    <span className="text-sm md:text-lg font-bold">✓</span>
                  ) : (
                    <span className="text-sm md:text-lg font-semibold">{index + 1}</span>
                  )}
                </motion.div>

                <div className="flex-1">
                  <h3 className={cn(
                    "text-base md:text-xl font-semibold mb-0.5 md:mb-1 transition-colors duration-300",
                    index === currentFeature ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {feature.title || feature.step}
                  </h3>
                  <p className="text-xs md:text-base text-muted-foreground">
                    {feature.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div
            className={cn(
              "order-1 md:order-2 relative h-[180px] md:h-[350px] lg:h-[450px] overflow-hidden rounded-xl md:rounded-2xl border border-border shadow-lg"
            )}
          >
            <AnimatePresence mode="wait">
              {features.map(
                (feature, index) =>
                  index === currentFeature && (
                    <motion.div
                      key={index}
                      className="absolute inset-0 rounded-2xl overflow-hidden"
                      initial={{ y: 100, opacity: 0, rotateX: -20 }}
                      animate={{ y: 0, opacity: 1, rotateX: 0 }}
                      exit={{ y: -100, opacity: 0, rotateX: 20 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      <img
                        src={feature.image}
                        alt={feature.step}
                        className="w-full h-full object-cover object-top transition-transform transform"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    </motion.div>
                  ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
