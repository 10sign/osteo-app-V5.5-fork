import React from 'react';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuccessBannerProps {
  message: string;
  isVisible: boolean;
  className?: string;
}

const SuccessBanner: React.FC<SuccessBannerProps> = ({
  message,
  isVisible,
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center ${className}`}
    >
      <CheckCircle size={20} className="text-green-500 mr-3 flex-shrink-0" />
      <span className="text-green-700 font-medium">{message}</span>
    </motion.div>
  );
};

export default SuccessBanner;