import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text, 
  fullScreen = false,
  className = ''
}) => {
  const sizeConfig = {
    small: { width: '1.5rem', height: '1.5rem', borderWidth: '2px' },
    medium: { width: '2.5rem', height: '2.5rem', borderWidth: '2px' },
    large: { width: '3rem', height: '3rem', borderWidth: '2px' }
  };

  const config = sizeConfig[size];

  const spinner = (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div 
        className="loading-spinner" 
        style={{
          width: config.width,
          height: config.height,
          borderRadius: '50%',
          borderTop: `${config.borderWidth} solid #004c59`,
          borderRight: `${config.borderWidth} solid transparent`,
          borderBottom: `${config.borderWidth} solid transparent`,
          borderLeft: `${config.borderWidth} solid transparent`
        }}
      ></div>
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </>
  );

  if (fullScreen) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          {spinner}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
