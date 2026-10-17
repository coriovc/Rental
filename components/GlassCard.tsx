
import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = "", 
  onClick,
  hoverEffect = false 
}) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hoverEffect ? { scale: 1.02, y: -4 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`
        bg-white/40 backdrop-blur-xl border border-white/60 
        shadow-[0_8px_32px_rgba(31,38,135,0.07)] 
        rounded-[2.5rem] overflow-hidden ${className}
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {children}
    </motion.div>
  );
};
