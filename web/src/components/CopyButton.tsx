import { useState } from "react";

export default function CopyButton({ text, label = "Copiar", className = "copy" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className={className} onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }).catch(() => {});
    }}>{done ? "Copiado" : label}</button>
  );
}
