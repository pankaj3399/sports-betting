// Badge.jsx
import React from 'react';

const Badge = ({ children, variant = "default", className = "" }) => {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variantStyles = {
    default: "bg-gray-100 text-gray-900",
    primary: "bg-blue-100 text-blue-900",
    secondary: "bg-gray-100 text-gray-900",
    destructive: "bg-red-100 text-red-900",
    success: "bg-green-100 text-green-900",
    warning: "bg-yellow-100 text-yellow-900",
    outline: "text-gray-900 border border-gray-200"
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

export default Badge;