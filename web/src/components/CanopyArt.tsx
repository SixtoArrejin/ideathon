import type { CSSProperties } from "react";

/** La marca de Dosel en grande: una copa hecha de píxeles de satélite que respira despacio. */
const CELLS: [number, number, number][] = [
  [2,0,.55],[3,0,.9],[4,0,.7],
  [1,1,.65],[2,1,.95],[3,1,1],[4,1,.85],[5,1,.6],
  [0,2,.5],[1,2,.8],[2,2,1],[3,2,.9],[4,2,1],[5,2,.75],[6,2,.45],
  [1,3,.55],[2,3,.8],[3,3,.95],[4,3,.7],[5,3,.5],
  [3,4,1],[3,5,1],[3,6,1],
];

export default function CanopyArt({ caption }: { caption?: string }) {
  const C = 30, G = 5, ox = 36, oy = 40;
  return (
    <figure className="art">
      <svg viewBox="0 0 320 320" role="img" aria-label="Copa de árbol formada por píxeles de satélite">
        {["M14 62V14h48", "M258 14h48v48", "M306 258v48h-48", "M62 306H14v-48"].map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="square" />
        ))}
        {CELLS.map(([c, r, o], i) => (
          <rect
            key={i}
            x={ox + c * (C + G)} y={oy + r * (C + G)} width={C} height={C}
            fill="var(--ok)" opacity={r >= 4 ? 1 : o}
            className={r >= 4 ? undefined : "px"}
            style={{ animationDelay: `${(i * 370) % 4200}ms`, "--o": o } as CSSProperties}
          />
        ))}
      </svg>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
