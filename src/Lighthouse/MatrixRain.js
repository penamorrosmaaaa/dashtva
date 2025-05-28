import React, { useRef, useEffect } from "react";

const MatrixRain = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const letters = "0123456789";
    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    let drops = Array(columns).fill(1);

    let lastTime = 0;
    const frameInterval = 1000 / 20; // 20 FPS

    const draw = (time) => {
      if (time - lastTime > frameInterval) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#0F0";
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const text = letters[Math.floor(Math.random() * letters.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          ctx.fillText(text, x, y);

          if (y > height && Math.random() > 0.975) {
            drops[i] = 0;
          }

          drops[i]++;
        }

        lastTime = time;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      columns = Math.floor(width / fontSize);
      drops = Array(columns).fill(1);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        opacity: 0.2,
        pointerEvents: "none",
      }}
    />
  );
};

export default MatrixRain;
