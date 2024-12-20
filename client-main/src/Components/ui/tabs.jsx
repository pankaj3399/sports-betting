import React from 'react';

const Tabs = ({ value, onValueChange, children, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, child => {
        if (child.type.displayName === 'TabsList' || child.type.displayName === 'TabsContent') {
          return React.cloneElement(child, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

const TabsList = ({ children, value, onValueChange, className = '' }) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>
      {React.Children.map(children, child => {
        if (child.type.displayName === 'TabsTrigger') {
          return React.cloneElement(child, { 
            isSelected: child.props.value === value,
            onClick: () => onValueChange(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
};

const TabsTrigger = ({ value, children, isSelected, onClick, className = '' }) => {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none 
        ${isSelected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'} 
        ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, triggerValue, children, className = '' }) => {
  if (value !== triggerValue) return null;
  return (
    <div className={`mt-2 ${className}`}>
      {children}
    </div>
  );
};

// Add displayNames for component recognition
Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };