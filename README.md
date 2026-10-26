# Job-Search-All-IA — Agente Autónomo de Búsqueda de Empleo con IA (Gemini / ChatGPT / Claude)

Un marco de trabajo inteligente y autónomo inspirado en [`ai-job-search`](https://github.com/ai-job-search-dev/ai-job-search), rediseñado desde cero para ser **multi-modelo** (optimizado para **Google Gemini**, **ChatGPT** y **Claude**), con cobertura para **mercados laborales en Chile y remotos en el mundo**, provisto de una **interfaz gráfica minimalista inspirada en el lenguaje de diseño de Apple (Cupertino)**, gestión del ciclo de vida de postulaciones con **bitácora histórica**, y un servidor **MCP (Model Context Protocol)** estándar para ser invocado directamente desde cualquier chat de IA o terminal.

---

## 🌟 Características Principales

### 1. Multi-LLM y Configuración Local Segura
- **Soporte Nativo de Google Gemini:** Modelos de última generación (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`) mediante el SDK oficial `google-genai`.
- **Compatibilidad con OpenAI & Anthropic:** Alterna con facilidad a **GPT-4o**, **GPT-4o-mini**, **Claude 3.5 Sonnet** o ingresa modelos personalizados para prevenir incompatibilidades con versiones descontinuadas.
- **Almacenamiento Local de Claves:** Tus API Keys y preferencias se almacenan localmente en tu equipo (`data/settings.json`), sin enviarse a servidores de terceros.
- **Indicador de Estado en Vivo (Navbar):**
  - 🟢 **Punto Verde + Modelo Activo:** IA conectada y lista para razonar.
  - 🟡 **Modo Offline Heurístico:** Operatividad inmediata sin API Key (búsqueda de empleo, navegación, seguimiento y guardado local).

### 2. Radar de Ofertas Laborales (Chile & Global Remoto)
- **Maximización del Mercado en Chile:** Conectores especializados para **Get on Board Chile, CompuTrabajo Chile, ChileTrabajos, Laborum Chile y LinkedIn Chile**.
- **Portales Globales Remotos:** Integración simultánea con **RemoteOK, Arbeitnow, Remotive y LinkedIn Global**.
- **Filtro de Alcance Instantáneo:** Alterna con un solo clic entre:
  - 🌐 *Todos (Chile + Global)*
  - 🇨🇱 *Solo Chile (presenciales, híbridos y remotos)*
  - 🌍 *Solo Global Remoto*
- **Importador Inteligente de URLs con Guardián de Seguridad:** Pega el enlace de cualquier oferta externa; el agente sanitiza caracteres invisibles y bloquea posibles ataques de inyección de prompt (*Prompt Injection Defense*).
- **Control de Vistas en Cards Compactas:** Configura la cuadrícula en **3 Cards por fila**, **2 Cards por fila** o **Vista de Lista** para maximizar la visibilidad.

### 3. Información Transparente en las Tarjetas (Cards del Radar)
- **Fechas Fidedignas sin Invención:** Muestra la fecha de publicación (`posted_at`) y la fecha límite de postulación (`deadline`). Si la fuente no la provee, indica explícitamente *"No disponible"* o *"Sin fecha de término conocida"*.
- **Badges de Estado de Vigencia:**
  - 🟢 *Publicada (Cierra en X días)*
  - 🟡 *Próxima a vencer (Hoy / X días)* con alerta visual
  - 🔴 *Oferta Vencida*
  - ⚪ *Sin fecha de término conocida*
- **Modal de Detalle Completo:** Inspecciona requisitos, condiciones, rango salarial, tags y descripción íntegra con saltos de línea preservados.
- **Postulación en 1 Clic:**
  - Si la vacante se postula por enlace: abre el portal original y actualiza el estado.
  - Si la vacante incluye correo de contacto: genera y pre-llena un correo formal personalizado con asunto y cuerpo profesional mediante `mailto:`.
- **Limpieza Segura del Radar:** Vacía ofertas descubiertas sin tocar ni afectar jamás los registros guardados en Seguimiento.

### 4. Módulo de Seguimiento de Postulaciones (Pipeline Tracker)
Convierte el seguimiento en un **registro personal, persistente e inviolable**. Una oferta enviada a Seguimiento nunca se borra automáticamente por limpieza de radar o vencimiento de plazos.

#### Ciclo de Vida de Postulaciones Activas:
1. 🟡 **Guardada / Pendiente (`saved`):** Oportunidades seleccionadas en espera de preparación de antecedentes.
2. 🟠 **CV Enviado / Postulado (`applied`):** Registro de envío con fecha exacta.
3. 🟣 **En Proceso (`interviewing` / `responded`):** Convocatorias con contacto o etapas evaluativas activas.

#### Registro Histórico y Bitácora del Proceso (Timeline):
- Registra cronológicamente cada hito del proceso de selección:
  - 👥 **Entrevistas:** RRHH, pruebas técnicas, entrevistas con gerentes o paneles finales.
  - 📞 **Respuestas de la Empresa:** Primer contacto por correo, LinkedIn o llamadas.
  - 💻 **Pruebas Técnicas:** Desafíos de código, retos para la casa o assessments.
  - 📝 **Notas de Seguimiento:** Apuntes sobre preguntas, impresiones y avances.
- Cronología visual que actualiza automáticamente la etapa del proceso al añadir eventos.

#### Clasificación Final según el Resultado:
- 🏆 **Oferta / Exitoso (`offer`):** Convocatorias que terminaron favorablemente con oferta formal o contratación.
- 📁 **Cerrado / No Exitoso (`rejected`):** Procesos que finalizaron sin oferta, con opción de generar un **Plan de Upskilling IA** para cerrar brechas de habilidades.
- **Historial Completo Preservado:** Toda la documentación, notas y fechas se conservan al archivar en categorías finales.
- **Reversibilidad:** Acción *"Reabrir Postulación"* disponible si se clasificó por error.

### 5. Documentos Asociados & Exportación Impecable
- **CV Adaptado por Oferta:** Visualiza el CV en Markdown diseñado para esa vacante específica.
  - Copiar al portapapeles.
  - Descargar en formato `.md`.
  - **Impresión / PDF Exclusivo:** Al imprimir (`Ctrl+P`), el navegador renderiza exclusivamente la hoja de vida limpia, ocultando barras de menú, navegación e interfaz.
- **Correo de Postulación Editable:** Asunto y cuerpo redactados para esa vacante, con guardado de cambios y apertura en cliente de correo.
- **Destino Claro:** Botones directos al enlace web o dirección de correo del reclutador.

### 6. Ajuste Laboral en 5 Dimensiones (Fit Evaluator)
Puntuación de ajuste objetivo (0 a 100%) en:
1. **Habilidades Técnicas** (*Technical Skills*)
2. **Experiencia y Seniority** (*Experience & Scope*)
3. **Cultura y Estilo de Trabajo** (*Culture & Pace*)
4. **Flexibilidad Remota y Zona Horaria** (*Remote Compatibility*)
5. **Alineación de Carrera y Expectativas Salariales** (*Career Goals*)
- **Detección Radical de Deal-Breakers:** Alerta instantánea si una oferta exige presencialidad obligatoria o condiciones inaceptables para ti.

### 7. Memoria Activa y Aprendizaje de Preferencias
- Cada vez que interactúas en el radar (**👍 Me interesa** o **👎 Descartar**), el agente deduce patrones implícitos para priorizar vacantes afines en futuras búsquedas.

---

## 🎨 Principios de Diseño Apple (Cupertino HIG)
- **Glassmorphism Frosted:** Fondos translúcidos con desenfoque (`backdrop-filter: blur(20px)`), bordes hiperfinos y tipografía del sistema.
- **Controles Segmentados:** Menú horizontal limpio sin sobrecarga de iconos.
- **Modo Claro y Modo Oscuro:** Transición fluida con paleta de alto contraste.

---

## 🚀 Inicio Rápido

### Opción A: Lanzador en 1 Clic (Windows)
Haz doble clic sobre:
```bash
start_app.bat
```
*(O ejecuta `./start_app.ps1` en PowerShell).*  
Instala automáticamente el entorno virtual, levanta el backend FastAPI y abre la aplicación en tu navegador.

### Opción B: Ejecución Manual

1. **Backend (FastAPI):**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   python backend/run.py
   ```

2. **Frontend (React + Vite):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Abre **http://localhost:3000** en tu navegador.

---

## 🔌 Conexión MCP (Model Context Protocol)

Puedes vincular este agente a **Gemini CLI**, **Claude Code**, **Cursor** o **ChatGPT**:

Agrega a tu configuración MCP (`claude_desktop_config.json` o settings de tu entorno):

```json
{
  "mcpServers": {
    "nexusjob-ai": {
      "command": "python",
      "args": ["run_mcp.py"],
      "cwd": "C:/Users/.../Agente busca empleo Gemini",
      "env": {
        "GEMINI_API_KEY": "tu_clave_de_gemini"
      }
    }
  }
}
```

### Herramientas MCP Disponibles:
- `search_remote_jobs(keywords, remote_only, scope, limit)`
- `evaluate_job_fit(job_id_or_url)`
- `tailor_application(job_id)`
- `track_job(job_id)`
- `add_job_history(job_id, event_type, title, notes)`
- `get_candidate_profile()`
- `record_feedback_and_learn(job_id, action, notes)`

---

## 📁 Estructura del Repositorio

```
Agente busca empleo Gemini/
├── backend/
│   ├── app/
│   │   ├── main.py                  # API REST FastAPI y endpoints de tracking/history
│   │   ├── config.py                # Ajustes de entorno, llaves y rutas
│   │   ├── mcp_server.py            # Servidor MCP estándar JSON-RPC
│   │   ├── models/schemas.py        # Modelos de datos Pydantic (JobPosting, TrackingHistoryEvent)
│   │   ├── storage/db.py            # Persistencia segura e independiente Radar/Seguimiento
│   │   ├── scrapers/                # Scrapers de Chile (GetOnBoard, CompuTrabajo, etc.) y Globales
│   │   └── agents/                  # Evaluador 5D, Drafter-Reviewer, Coach y Learner
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── JobRadar.tsx         # Radar de búsqueda, cards compactas y fechas
│   │   │   ├── PipelineTracker.tsx  # Seguimiento, etapas, bitácora histórica y resultados
│   │   │   ├── ApplicationStudio.tsx# Visualizador y exportador de CV / Carta ATS
│   │   │   └── SettingsModal.tsx    # Configuración de LLM, modelos y API keys
│   │   ├── utils/dateUtils.ts       # Cálculos de fechas, vigencias y badges sin inventar datos
│   │   ├── types.ts                 # Tipos TypeScript compartidos
│   │   └── api.ts                   # Cliente de conexión REST
│   ├── package.json
│   └── vite.config.ts
├── data/                            # Almacenamiento local (perfil, vacantes, notas y llaves)
├── start_app.bat                    # Lanzador rápido Windows
└── README.md
```

---

## 🛡️ Seguridad, Privacidad e Integridad
- **Almacenamiento Local Estricto:** Tus datos personales, currículum vitae, notas de entrevistas y API keys residen únicamente en tu máquina local.
- **Protección de Datos en Seguimiento:** La limpieza del Radar no toca las ofertas en Seguimiento; las fechas y el historial se preservan de forma definitiva.
- **Cero Alucinaciones en CVs:** El pipeline Drafter-Reviewer reorganiza y resalta evidencia real de tu perfil, sin inventar ni exagerar competencias.
