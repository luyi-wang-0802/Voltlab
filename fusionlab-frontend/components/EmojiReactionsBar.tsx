import React, { useRef, useState } from "react";

const emojiList = [
  { emoji: "😍", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🤩", label: "Star" },
];

interface FlyingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

const EmojiReactionsBar: React.FC = () => {
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
  const nextId = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (emoji: string, ev: React.MouseEvent<HTMLButtonElement>) => {
    const bar = barRef.current;
    if (!bar) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = ev.currentTarget.getBoundingClientRect();
    const x = btnRect.left - barRect.left + btnRect.width / 2;
    const y = btnRect.top - barRect.top + btnRect.height / 2;
    const id = nextId.current++;
    setFlyingEmojis((prev) => [...prev, { id, emoji, x, y }]);
    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 1000);
  };

  return (
    <div ref={barRef} style={{ position: "relative", minHeight: 160 }} className="flex gap-4 py-2 select-none justify-center items-center">
      {/* Poster-Bilder als Deko oben */}
      
      {emojiList.map((item) => (
        <button
          key={item.label}
          className="text-2xl md:text-3xl bg-transparent relative z-10"
          title={item.label}
          onClick={(ev) => handleClick(item.emoji, ev)}
        >
          {item.emoji}
        </button>
      ))}
      {flyingEmojis.map((e) => (
        <span
          key={e.id}
          className="emoji-fly select-none text-2xl pointer-events-none"
          style={{
            left: e.x,
            top: e.y,
            position: "absolute",
            zIndex: 50,
            animation: "flyUp 1s cubic-bezier(0.22,1,0.36,1)",
            overflow:"visible",
          }}
        >
          {e.emoji}
        </span>
      ))}
      <style>{`
        @keyframes flyUp {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          80% { transform: translate(-50%, -170%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -220%) scale(1.1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default EmojiReactionsBar;
