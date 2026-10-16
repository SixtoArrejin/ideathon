import { useState } from "react";
import { REPO_URL } from "../config";
import Modal from "./Modal";

type Props = { open: boolean; onClose: () => void };

/** Recoge propuestas de predios nuevos: abre un issue prellenado en el repositorio (sin servidor propio). */
export default function ProposeParcel({ open, onClose }: Props) {
  const [f, setF] = useState({ name: "", zone: "", lat: "", lon: "", ha: "", role: "Propietario", contact: "", notes: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const ok = f.name.trim().length > 2 && f.zone.trim().length > 2 && /^-?\d+([.,]\d+)?$/.test(f.lat.trim()) && /^-?\d+([.,]\d+)?$/.test(f.lon.trim());

  function send() {
    const body = [
      "## Propuesta de predio", "",
      `- **Nombre:** ${f.name}`, `- **Provincia y zona:** ${f.zone}`,
      `- **Coordenadas aproximadas (lat, lon):** ${f.lat}, ${f.lon}`,
      `- **Hectáreas aproximadas:** ${f.ha || "sin dato"}`, `- **Quién propone:** ${f.role}`,
      `- **Contacto:** ${f.contact || "sin dato"}`, "", "### Notas", f.notes || "-", "",
      "_Enviado desde la web de Dosel. Este issue es público._",
    ].join("\n");
    const url = `${REPO_URL}/issues/new?labels=propuesta-predio&title=${encodeURIComponent(`Propuesta de predio: ${f.name}`)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener");
    onClose();
  }

  return (
    <Modal open={open} title="Proponé un predio para medir" onClose={onClose} actions={
      <>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" disabled={!ok} onClick={send}>Abrir propuesta en GitHub</button>
      </>
    }>
      <p>Contanos dónde está. Con las coordenadas, el oráculo puede medir el vigor de ese polígono y ver si coincide con lo que se declara. La propuesta se publica como un issue del repositorio, así que no pongas datos que no quieras hacer públicos.</p>
      <div className="fields">
        <label htmlFor="p-name">Nombre del predio<input id="p-name" value={f.name} maxLength={80} onChange={set("name")} /></label>
        <label htmlFor="p-zone">Provincia y zona<input id="p-zone" value={f.zone} maxLength={80} placeholder="Chaco, cerca de Taco Pozo" onChange={set("zone")} /></label>
        <div className="two">
          <label htmlFor="p-lat">Latitud<input id="p-lat" inputMode="decimal" value={f.lat} placeholder="-25.62" onChange={set("lat")} /></label>
          <label htmlFor="p-lon">Longitud<input id="p-lon" inputMode="decimal" value={f.lon} placeholder="-61.65" onChange={set("lon")} /></label>
        </div>
        <div className="two">
          <label htmlFor="p-ha">Hectáreas (aprox.)<input id="p-ha" inputMode="numeric" value={f.ha} onChange={set("ha")} /></label>
          <label htmlFor="p-role">Quién propone
            <select id="p-role" value={f.role} onChange={set("role")}>
              <option>Propietario</option><option>ONG o técnico</option><option>Empresa compradora</option><option>Otro</option>
            </select>
          </label>
        </div>
        <label htmlFor="p-contact">Contacto (opcional)<input id="p-contact" value={f.contact} maxLength={80} placeholder="Correo o usuario" onChange={set("contact")} /></label>
        <label htmlFor="p-notes">Notas (opcional)<input id="p-notes" value={f.notes} maxLength={200} onChange={set("notes")} /></label>
      </div>
    </Modal>
  );
}
