import React from 'react';
import './template-styles.css';

interface TemplateComponentProps {
  title: string;
  data: any[];
}

export const TemplateComponent: React.FC<TemplateComponentProps> = ({ title, data }) => {
  return (
    <div className="template-container">
      <h2>{title}</h2>
      <div className="template-content">
        {data.map((item, index) => (
          <div key={index} className="template-item">
            {JSON.stringify(item)}
          </div>
        ))}
      </div>
    </div>
  );
};
