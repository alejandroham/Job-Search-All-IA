# Job-Search-All-IA — Agente Autónomo de Búsqueda de Empleo con IA (Gemini / ChatGPT / Claude)

Un marco de trabajo inteligente y autónomo inspirado en [`ai-job-search`](https://github.com/ai-job-search-dev/ai-job-search), rediseñado desde cero para ser **multi-modelo** (optimizado para **Google Gemini**, **ChatGPT** y **Claude**) y provisto de una **interfaz gráfica minimalista inspirada en el lenguaje de diseño de Apple (Cupertino)**, además de un servidor **MCP (Model Context Protocol)** estándar para ser invocado directamente desde cualquier chat de IA o terminal.

---

## 🌟 Características Principales

### 1. Multi-LLM y Agnóstico de Modelo
- **Soporte Nativo de Google Gemini:** Integra los modelos más recientes (`gemini-2.5-flash`, `gemini-2.5-pro`) a través del SDK oficial `google-genai`.
- **Compatibilidad con OpenAI & Claude:** Alterna con un solo clic a **GPT-4o** o **Claude 3.5 Sonnet** desde el panel de ajustes o mediante variables de entorno.
- **Modo Offline / Heurístico:** Funciona de inmediato sin necesidad de ingresar una clave de API previa, permitiendo probar la interfaz, el escaneo de vacantes y la navegación.

### 2. Radar de Empleo Remoto Global
- **Conectores Automatizados en Vivo:** Búsqueda en agregadores de empleo tecnológico y remoto internacional (**RemoteOK, Arbeitnow, Remotive, FreeHire, LinkedIn Guest Search**).
- **Importador de URLs con Guardián de Seguridad:** Pega el enlace de cualquier oferta (Greenhouse, Lever, LinkedIn, Indeed, etc.) o su texto directo; el agente sanitiza caracteres invisibles y previene inyecciones de prompt (*Prompt Injection Defense*).

### 3. Ajuste Laboral en 5 Dimensiones (Fit Evaluator)
- Puntuación de ajuste objetivo de 0 a 100% en:
  1. **Habilidades Técnicas** (*Technical Skills*)
  2. **Experiencia y Seniority** (*Experience & Scope*)
  3. **Cultura y Estilo de Trabajo** (*Culture & Pace*)
  4. **Flexibilidad Remota y Zona Horaria** (*Remote Compatibility*)
  5. **Alineación de Carrera y Expectativas Salariales** (*Career Goals*)
- **Detección Radical de Deal-Breakers:** Alerta instantánea si una oferta exige presencialidad estricta o no cumple tus condiciones críticas.

### 4. Pipeline Drafter-Reviewer (CV & Carta ATS)
- **Separación de Roles:** Un agente redactor (*Drafter*) contextualiza tus proyectos y viñetas de logros según las palabras clave de la oferta; un segundo agente auditor (*Reviewer*) critica el texto desde el punto de vista del reclutador y del filtro ATS.
- **Regla de Honestidad Estricta:** Nunca inventa experiencia ni tecnologías inexistentes en tu perfil. Las brechas se señalan como oportunidades de aprendizaje.
- **Exportación Versátil:** Vista previa en formato Apple, copia con un clic, descarga en Markdown e impresión directa / PDF.

### 5. Memoria Activa & Aprendizaje de Preferencias
- Cada vez que interactúas en el radar (**👍 Me interesa** o **👎 Descartar**), el agente analiza el historial y deduce patrones implícitos (e.g. *“Prioriza roles orientados a arquitecturas de datos”*, *“Evita posiciones con guardias de fin de semana”*).

### 6. Coach de Entrevistas (Simulador STAR)
- Preguntas técnicas probables y preguntas conductuales emparejadas con historias reales de tu CV.
- Simulador interactivo: escribe tu respuesta y recibe una nota con recomendaciones de impacto y una versión reformulada con el método STAR.

---

## 🎨 Diseño con Principios de Apple (Cupertino HIG)
- **Estética Frosted Glass (*Glassmorphism*):** Fondos translúcidos con desenfoque (`backdrop-filter: blur(20px)`), bordes hiperfinos y tipografía del sistema (San Francisco / Inter).
- **Controles Segmentados:** Navegación fluida y sin distracciones.
- **Modo Claro y Oscuro:** Soporte completo con paleta de contrastes refinada.

---

## 🚀 Inicio Rápido

### Opción A: Ejecución con 1 Clic (Windows)
Haz doble clic sobre el archivo:
```bash
start_app.bat
```
*(O ejecuta `./start_app.ps1` en PowerShell).*  
Esto instalará las dependencias en un entorno virtual y abrirá automáticamente tu navegador en **http://localhost:8000**.

### Opción B: Ejecución Manual
1. **Crear entorno virtual e instalar dependencias:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   pip install python-multipart
   ```

2. **Iniciar el servidor:**
   ```bash
   python backend/run.py
   ```
3. Abre **http://localhost:8000** en tu navegador.

---

## 🔌 Conexión MCP (Model Context Protocol)

Puedes llamar a este agente directamente desde **Gemini CLI**, **Claude Code**, **Cursor** o **ChatGPT**:

Agrega a tu archivo de configuración MCP (`claude_desktop_config.json` o configuración de Cursor/Gemini):

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

### Herramientas MCP Expuestas:
- `search_remote_jobs(keywords, remote_only, limit)`
- `evaluate_job_fit(job_id_or_url)`
- `tailor_application(job_id)`
- `get_candidate_profile()`
- `record_feedback_and_learn(job_id, action, notes)`

---

## 📁 Estructura del Proyecto

```
Agente busca empleo Gemini/
├── backend/
│   ├── app/
│   │   ├── main.py                  # API FastAPI y montaje de frontend
│   │   ├── config.py                # Configuración de llaves y rutas
│   │   ├── mcp_server.py            # Servidor MCP estándar JSON-RPC
│   │   ├── models/schemas.py        # Modelos de datos Pydantic
│   │   ├── storage/db.py            # Base de datos persistente JSON/SQLite
│   │   ├── scrapers/                # Scrapers de RemoteOK, Arbeitnow, Remotive, LinkedIn
│   │   └── agents/                  # Evaluador 5D, Drafter-Reviewer, Coach y Learner
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/                         # Componentes en React + Tailwind (Apple Design)
│   ├── dist/                        # Build de producción compilado
│   └── package.json
├── data/                            # Perfil de usuario, ofertas cacheadas y memoria
├── start_app.bat                    # Lanzador en 1 clic para Windows
├── run_mcp.py                       # Runner MCP independiente
└── README.md
```

---

## 🛡️ Seguridad y Privacidad
- Todos tus datos (currículum, postulaciones, preferencias aprendidas) se almacenan localmente en la carpeta `data/` de tu máquina.
- Las ofertas de empleo se filtran contra ataques de inyección de prompt antes de procesarse con cualquier LLM.
- Cumple con la política de **cero invención de datos**: la IA sólo reorganiza y resalta evidencia real que tú hayas incluido en tu CV.
