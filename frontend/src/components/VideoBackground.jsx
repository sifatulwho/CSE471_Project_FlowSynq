import React from 'react';
import bgVideo from '../assets/bg-video.mp4';
const VideoBackground = () => {
  return (
    <div className="fixed inset-0 w-full h-full -z-50 overflow-hidden">
      <video                                                                                    //new file code
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover opacity-100"
      >
        <source src={bgVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-black/20"></div>
    </div>
  );
};
export default VideoBackground;