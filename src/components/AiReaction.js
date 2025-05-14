import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import avatarAnimation from '../assets/avatar.json';
import './AiReaction.css';

const messages = ["Bravo!", "I see improvement!", "You're on a streak!", "Nice focus!", "Way to go!"];

export default function AiReaction() {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const chosen = messages[Math.floor(Math.random() * messages.length)];
    setMsg(chosen);
    let i = 0;
    const interval = setInterval(() => {
      setText(chosen.slice(0, i + 1));
      i++;
      if (i === chosen.length) clearInterval(interval);
    }, 70);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ai-reaction">
      <div className="ai-avatar">
        <Lottie animationData={avatarAnimation} loop={true} style={{ height: 60 }} />
      </div>
      <div className="ai-bubble">
        {text}
        <span className="cursor">|</span>
      </div>
    </div>
  );
}
