import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

interface TestimonialsColumnProps {
  testimonials: Testimonial[];
  className?: string;
  duration?: number;
}

export const TestimonialsColumn = ({
  testimonials,
  className,
  duration = 15,
}: TestimonialsColumnProps) => {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6"
      >
        {[...testimonials, ...testimonials].map((testimonial, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm max-w-xs"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              "{testimonial.text}"
            </p>
            <div className="flex items-center gap-3 mt-4">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {testimonial.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {testimonial.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
