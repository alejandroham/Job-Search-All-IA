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

### 2. Radar de Ofertas Laborales & Motor Inteligente ATS
- **Maximización del Mercado en Chile:** Conectores especializados para **Get on Board Chile, CompuTrabajo Chile, ChileTrabajos, Laborum Chile y LinkedIn Chile**.
- **Portales Globales Remotos:** Integración simultánea con **RemoteOK, Arbeitnow, Remotive y LinkedIn Global**.
- **Directorio de Empresas Corporativas y ATS (Chile & Global):**
  - Base de datos categorizada con más de 100 empresas líderes en Chile (Tecnología, Banca/Fintech, Minería, Energía, Retail, Telecomunicaciones) e Internacionales (Big Tech, SaaS, AI, Fintech, Remoto).
  - Identificación directa del portal ATS corporativo (**Workday, Greenhouse, Lever, Ashby, SmartRecruiters, SuccessFactors, Taleo**).
  - Acceso directo a portales de carrera oficiales con filtros por país e industria.
- **Estrategia Dinámica de Roles ATS basada en CV:**
  - En lugar de títulos fijos o búsquedas rígidas, la IA analiza el perfil real del candidato y deduce familias de cargos estratégicas:
    - 🎯 **Coincidencia Directa (`direct`):** Roles donde existe trayectoria comprobada.
    - 🔄 **Habilidad Transferible (`transferable`):** Roles afines de alta compatibilidad con competencias trasladables.
    - 💡 **Oportunidad Exploratoria (`exploratory`):** Roles de proyección con requisitos específicos a validar.
  - El usuario puede activar, pausar o descartar familias de cargos según su interés.
- **Generador y Ejecutor de Consultas Booleanas (ATS Dorks):**
  - Generación de operadores booleanos listos (`site:boards.greenhouse.io`, `site:jobs.lever.co`, `site:jobs.ashbyhq.com`, `site:myworkdayjobs.com`).
  - Motor de búsqueda ATS directo que indexa ofertas reales desde portales limpios sin intermediarios ni muros de registro.
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
- **Apertura de Canales sin Falsos Positivos:** Abrir el portal web de postulación o generar el borrador de correo abre el canal correspondiente y guarda la oportunidad en seguimiento, **sin marcarla erróneamente como enviada**.
- **Limpieza Segura del Radar:** Vacía ofertas descubiertas sin tocar ni afectar jamás los registros guardados en Seguimiento.

### 4. Gestión Integral de Postulaciones (Flujo Lineal de 6 Etapas)
Convierte el seguimiento en un **registro personal, persistente e inviolable**. Una oferta enviada a Seguimiento nunca se borra automáticamente por limpieza de radar o vencimiento de plazos.

```
1. RADAR ──(+ Seguimiento)──► 2. EVALUACIÓN (Pendiente de revisión | Apta | Descartada)
                                     │
                                     ▼ (Si es Apta)
                              3. PREPARACIÓN (En preparación CV/Carta/Correo | Listo para enviar)
                                     │
                                     ▼ (Envío manual en portal/correo)
                              4. POSTULACIÓN (Pendiente de envío ──Confirmación real──► Enviada)
                                     │
                                     ▼
                              5. SEGUIMIENTO (Enviada sin respuesta | Contacto | Entrevistas | En evaluación)
                                     │
                                     ▼ (Fin del proceso)
                              6. DECISIÓN (🏆 Oferta / Exitoso  o  📁 Cerrado / No Exitoso)
```

#### Detalle de las 6 Etapas:

1. **Etapa 1: Radar (Descubrimiento):**
   - Rastreo en portales chilenos e internacionales.
   - Decisión de incorporar a seguimiento con el botón `+ Seguimiento`.

2. **Etapa 2: Evaluación (Decidir si postular):**
   - Analiza el ajuste dimensional del candidato frente a la vacante.
   - Identifica requisitos obligatorios, deseables, observaciones y brechas.
   - Estados:
     - 🟡 **Pendiente de revisión:** Oportunidad guardada para análisis.
     - 🔵 **Apta para postular:** Cumple condiciones y avanza a preparación de CV.
     - ⚪ **Descartada en evaluación:** Se archiva en la sub-pestaña de descartadas con sus motivos, sin ensuciar las postulaciones activas.

3. **Etapa 3: Preparación (Personalizar la postulación):**
   - Adaptación del CV y carta de presentación con IA (*Drafter-Reviewer*).
   - Redacción y personalización del correo de postulación para el reclutador.
   - Estados:
     - 🟣 **En preparación:** Documentos en borrador o ajuste.
     - 🟢 **Listo para enviar:** Documentos aprobados y listos para postular.

4. **Etapa 4: Postulación (Enviar candidatura):**
   - Envío mediante el canal correspondiente (Portal web de la empresa, correo, LinkedIn Easy Apply, referido).
   - **Confirmación Explícita de Envío:** Modal donde el usuario registra la fecha real de envío, canal, notas y **número de comprobante o ID de solicitud**.
   - Solo tras esta confirmación formal la candidatura pasa a estar **Enviada** en Seguimiento.

5. **Etapa 5: Seguimiento (Control activo del proceso):**
   - Estados dinámicos:
     - ✉️ *Enviada (Sin respuesta aún)*
     - 📞 *Contacto recibido*
     - 👥 *Entrevista agendada*
     - 👥 *Entrevista realizada*
     - 💻 *En evaluación / Prueba técnica*
     - 🎯 *Etapa final*
   - **Bitácora y Cronología Histórica:** Registro de cada hito, entrevista, notas de reclutadores y feedback.
   - **Recordatorios de Follow-up:** Programación de fechas para consultar estado si la empresa no responde.

6. **Etapa 6: Decisión (Resultado del proceso):**
   - 🏆 **Oferta / Exitoso (`offer`):** Convocatorias concluidas favorablemente con oferta laboral formal o contratación.
   - 📁 **Cerrado / No Exitoso (`rejected`):** Rechazos, convocatorias cerradas o retiros voluntarios, con opción de generar un **Plan de Upskilling IA** para cerrar brechas de habilidades.
   - **Regla Fundamental:** Ninguna postulación se cierra sola por vencimiento de plazo o falta de respuesta; el usuario mantiene el control absoluto.
   - **Reversibilidad:** Botón *"Reabrir Postulación"* disponible para devolver el registro al seguimiento activo si se cerró por error.

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
│   │   ├── main.py                  # API REST FastAPI, tracking, roles y endpoints ATS
│   │   ├── config.py                # Ajustes de entorno, llaves y rutas
│   │   ├── mcp_server.py            # Servidor MCP estándar JSON-RPC
│   │   ├── models/schemas.py        # Modelos de datos Pydantic (JobPosting, TrackingHistory, ATS)
│   │   ├── storage/db.py            # Persistencia Radar, Seguimiento, Empresas y Roles
│   │   ├── storage/companies_seed.py# Directorio seed de empresas líderes y portales ATS
│   │   ├── scrapers/                # Scrapers de Chile, Globales y Motor ATS Dorks
│   │   └── agents/                  # Evaluador 5D, Drafter, Revisor y Recomendantor de Roles ATS
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
