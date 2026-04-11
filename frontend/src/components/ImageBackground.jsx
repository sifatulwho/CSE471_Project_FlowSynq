import React from 'react';

const ImageBackground = ({ imageSrc }) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <img
        src={imageSrc}                            //new file
        alt="Background"
        className="w-full h-full object-cover" 
      />
      <div className="absolute inset-0 bg-black/10"></div>
    </div>
  );
};

export default ImageBackground;