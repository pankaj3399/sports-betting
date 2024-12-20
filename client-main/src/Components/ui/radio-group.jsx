// RadioGroup.jsx
import React from 'react';
const RadioGroup = ({ value, onValueChange, children, className = '' }) => {
    const radioName = React.useId(); // Generate unique name for the radio group
  
    return (
      <div className={`flex gap-4 ${className}`}>
        {React.Children.map(children, child => {
          return React.cloneElement(child, {
            checked: value === child.props.value,
            onChange: () => onValueChange(child.props.value),
            name: radioName // Add this to ensure radios are grouped
          });
        })}
      </div>
    );
  };
  
  const RadioGroupItem = ({ value, id, checked, onChange, name, children }) => {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
        />
        <label htmlFor={id} className="text-sm font-medium text-gray-900">
          {children}
        </label>
      </div>
    );
  };

export { RadioGroup, RadioGroupItem };