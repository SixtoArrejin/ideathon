# Evidencia de validación del problema

> **Transparencia:** en este proyecto **no se hicieron entrevistas ni encuestas a usuarios**. La validación es
> **investigación documental de fuentes públicas** (ONG, prensa, legislativo) más una **validación técnica con datos reales**
> (Sentinel-2) sobre predios del Gran Chaco. Los datos citados de Greenpeace son estimaciones de esa ONG, no cifras oficiales
> del Estado; verificarlos con la Dirección de Bosques de la Nación antes de usarlos en un contexto formal.

## 1. El problema existe y es grande

| Dato | Fuente |
|---|---|
| En 2024 se desmontaron ~119.886 ha de bosque nativo en el norte (Santiago del Estero 54.123, Chaco 39.182, Formosa 15.069, Salta 11.512). En Chaco, todo lo desmontado en 2024 fue ilegal (desmontes suspendidos por la justicia desde el 16/10/2020). | [Informe de deforestación 2024, Greenpeace](https://www.greenpeace.org/static/planet4-argentina-stateless/2025/01/96e4c507-informedeforestacion-greenpeace-1.pdf) |
| En 2025: 94.204 ha desmontadas + 116.498 ha quemadas = 210.702 ha perdidas. Entre 1998 y 2024 se perdieron más de 7 millones de ha; ~75% en cuatro provincias del norte. | [Informe anual 2025, Greenpeace](https://www.greenpeace.org/static/planet4-argentina-stateless/2026/02/b30fdf7a-informeanualdeforestacionfinal-gp2025.pdf) |
| Greenpeace documentó (agosto 2025) desmontes ilegales en cuatro estancias cerca de Taco Pozo, el Parque Nacional Copo y la Reserva Loro Hablador; ~167.684 ha deforestadas ilegalmente entre nov-2020 y jul-2025 en Chaco. | [Greenpeace Argentina](https://www.greenpeace.org/argentina/story/problemas/bosques/greenpeace-documento-desmontes-ilegales-en-chaco-170-mil-hectareas-deforestadas-desde-la-suspension-judicial/) |

## 2. El mercado de carbono argentino está sin marco y sin confianza verificable

- El marco regulatorio del mercado de carbono **sigue en el Congreso**: el Senado emitió dictamen favorable (2 de septiembre de 2026) sobre un texto unificado basado en la iniciativa de la senadora Flavia Royón (S-808/26) y el S-865/26; aún falta el recinto. Fuente: [El Economista](https://eleconomista.com.ar/energia/mercados-carbono-argentina-desafio-convertir-potencial-inversion-n98080).
- El registro vigente (ReNaMi) tenía **59 proyectos** en 2023: 46 MDL, 12 VCS, 1 GSGG. Misma fuente.
- Un trabajo académico de la UNNE señala un **vacío legal** y propone usar estándares internacionales hasta que existan guías propias: [Valoración de los servicios ecosistémicos de los bosques nativos de Argentina (UNNE)](https://repositorio.unne.edu.ar/items/6efff6c0-ee8a-4186-a882-de1a23947968).
- Misiones busca financiar su estrategia REDD+ con créditos y dice estar en contacto con 25 mil pequeños propietarios de bosque nativo; hay un conflicto abierto sobre a quién pertenecen los bonos (productor o provincia): [Bichos de Campo](https://bichosdecampo.com/a-quien-pertenecen-los-bonos-de-carbono-al-productor-dueno-del-bosque-protegido-o-a-la-provincia-donde-se-situa-se-abre-otro-frente-de-conflicto-contra-los-politicos-que-intentan-recauda/).
- Riesgo de créditos sin respaldo: en Brasil, Verra suspendió proyectos ligados a una investigación de la Policía Federal por acaparamiento de tierras y lavado de madera ilegal (caso Carbonext). **No se encontró evidencia de un caso equivalente en Argentina**; se cita solo como antecedente regional del riesgo.

## 3. Validación técnica con datos reales (reproducible)

El oráculo (`oracle/`) calculó NDVI real de Sentinel-2 L2A sobre tres predios y lo registró on-chain:

| Predio | NDVI 2019 (base) | NDVI 2026 | Resultado on-chain |
|---|---|---|---|
| IMPEN1 (Impenetrable) | 0,768 | 0,769 | emite en ambos períodos |
| CHACO1 (P.N. Chaco) | 0,771 | 0,773 | emite en ambos períodos |
| TACOP1 (lote en la zona Taco Pozo/Copo) | 0,814 | 0,612 | **congelado**, sin emisión |

Las transacciones están en el README. TACOP1 es un lote elegido porque su NDVI cae; **no está confirmado como desmonte ilegal**.

Durante el desarrollo se detectó y corrigió un error real: sin aplicar el offset de reflectancia (−0,1) de las escenas de baseline ≥ 04.00, el NDVI de 2026 salía artificialmente ~0,3 más bajo que el de 2019 incluso en un parque nacional.

## 4. Lo que falta validar (honestidad)

- Entrevistas con propietarios, ONG/INTA y empresas compradoras.
- Que el factor NDVI→tCO₂e (simplificado) se reemplace por una metodología reconocida (p. ej. VCS/IPCC).
- Que un auditor humano real participe del ciclo (`unfreeze` está pensado para eso).
