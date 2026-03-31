import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedCard({ 
  children, 
  className = '', 
  delay = 0,
  hover = true,
  onClick 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      className={`bg-white rounded-2xl shadow-md border border-blue-100/60 overflow-hidden ${hover ? 'cursor-pointer transition-shadow duration-300 hover:shadow-lg' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
