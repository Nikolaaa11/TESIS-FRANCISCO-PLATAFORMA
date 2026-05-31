# Plataforma web de la tesis (estática · Vercel)

Sitio de presentación de la tesis con estética moderna (estilo Apple, fondo blanco) y gráficos
generados a partir de los **datos reales** del proyecto.

## Archivos
- `index.html` — estructura y contenido (secciones, tecnicismos).
- `styles.css` — estilo Apple (tipografía del sistema, tarjetas, blur en nav).
- `app.js` — carga `data.json` y dibuja los gráficos con Chart.js (CDN).
- `data.json` — resultados reales exportados por `python -m src.export_web`.
- `logo_uss.png` — **(falta)** logo de la Universidad San Sebastián. Deposítalo aquí.
- `vercel.json` — configuración de despliegue.

## Regenerar los datos
Desde la raíz del proyecto:
```bash
python -m src.export_web
```
Esto recomputa los resultados y reescribe `web/data.json`.

## Probar localmente
```bash
python -m http.server 5050 --directory web
# abrir http://localhost:5050
```

## Desplegar en Vercel
**Opción 1 — desde GitHub (recomendada):**
1. Entra a https://vercel.com → *Add New… → Project*.
2. Importa el repositorio `Nikolaaa11/TESIS-FRANCISCO-RIETTA`.
3. En *Root Directory* selecciona **`web`**.
4. Framework Preset: **Other** (sitio estático, sin build). Deploy.

**Opción 2 — CLI:**
```bash
npm i -g vercel
cd web
vercel        # y luego: vercel --prod
```

## Nota
Los gráficos muestran resultados **preliminares** (faltan EMBI y controles de empresa); el
pie de página lo declara explícitamente.
