// 📁 src/Lighthouse/AnimatedBackground.js
import React from "react";

const AnimatedBackground = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    background: 'radial-gradient(circle at 20% 80%, rgba(0,240,255,0.05), transparent 60%)',
    pointerEvents: 'none',
  }} />
);

export default AnimatedBackground;
