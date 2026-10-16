export type ErrorContext = "greenton" | "market";

const MARKET: Record<number, string> = {
  1: "La cantidad tiene que ser mayor que cero.",
  2: "El precio tiene que ser mayor que cero.",
  3: "Esa oferta no existe.",
  4: "La oferta ya está cerrada: se vendió entera o la canceló su dueño.",
  5: "La oferta no tiene tantas toneladas disponibles. Alguien pudo comprar antes que vos.",
  6: "Solo quien publicó la oferta puede cancelarla.",
};
const GREENTON: Record<number, string> = {
  1: "Ese predio ya está registrado.",
  2: "Ese predio no está registrado.",
  3: "El predio está congelado.",
  4: "Ese período ya se emitió para el predio.",
  5: "La cantidad tiene que ser mayor que cero.",
  6: "El saldo de ese lote no alcanza.",
  7: "El predio no está congelado.",
};

/** Traduce los errores de la red y de Freighter a una explicación que se pueda actuar. */
export function explainError(e: unknown, ctx?: ErrorContext): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/declin|reject|denied|cancel|user closed/i.test(raw)) {
    return "Cancelaste la firma en Freighter. No se cobró nada y no cambió nada en la red.";
  }
  const code = raw.match(/Error\(Contract, #(\d+)\)/)?.[1];
  if (code) {
    const n = Number(code);
    const msg = (ctx === "greenton" ? GREENTON : MARKET)[n];
    if (msg) return msg;
    if (n === 10) return "Tu cuenta no tiene saldo suficiente de XLM para este pago. Podés cargar XLM de prueba desde Stellar Lab.";
  }
  if (/insufficient|underfunded|op_low_reserve|tx_insufficient_balance/i.test(raw)) {
    return "Tu cuenta no tiene saldo suficiente de XLM para pagar la operación. Podés cargar XLM de prueba desde Stellar Lab.";
  }
  if (/account not found|not found.*account|Account.*not found/i.test(raw)) {
    return "Esta cuenta todavía no existe en Testnet. Fondeala con Friendbot desde Stellar Lab y probá de nuevo.";
  }
  if (/timeout/i.test(raw)) {
    return "La red tardó demasiado en confirmar. Revisá en Stellar Expert si la operación salió antes de reintentar.";
  }
  if (/fetch|network ?error|failed to fetch/i.test(raw)) {
    return "No pudimos comunicarnos con la red de Stellar. Revisá tu conexión y probá de nuevo.";
  }
  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
}
