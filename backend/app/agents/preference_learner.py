from typing import List, Dict, Any
from app.models.schemas import FeedbackAction, UserPreferences
from app.storage.db import db
from app.agents.llm_provider import llm
import logging
import json

logger = logging.getLogger(__name__)

class PreferenceLearner:
    def process_feedback(self, event: FeedbackAction) -> UserPreferences:
        db.record_feedback(event)
        
        # Analyze feedback history when enough events exist (or on each event)
        history = db.get_feedback_history()
        prefs = db.get_preferences()
        
        # If we have at least 2 events, trigger preference reflection
        if len(history) >= 2:
            try:
                new_insights = self._extract_insights(history, prefs)
                if new_insights:
                    prefs.auto_learned_insights = new_insights
                    db.save_preferences(prefs)
            except Exception as e:
                logger.error(f"Error extracting learned insights: {e}")

        return prefs

    def _extract_insights(self, history: List[Dict[str, Any]], prefs: UserPreferences) -> List[str]:
        system_instruction = (
            "Eres un agente de aprendizaje de preferencias de carrera laboral. Tu trabajo es analizar las acciones "
            "del usuario (empleos que le gustaron, empleos que descartó, motivos de rechazo) y deducir reglas claras "
            "y concisas sobre sus preferencias implícitas."
        )

        prompt = f"""
HISTORIAL DE ACCIONES DEL USUARIO (Últimas {min(len(history), 10)} interacciones):
{json.dumps(history[-10:], ensure_ascii=False, indent=2)}

REGLAS APRENDIDAS PREVIAMENTE:
{json.dumps(prefs.auto_learned_insights, ensure_ascii=False)}

Deduce entre 3 y 6 reglas de preferencia aprendidas en lenguaje claro y positivo o negativo (e.g., 'Prioriza vacantes con salarios > 70k USD', 'Prefiere equipos con enfoque en TypeScript y Python', 'Evita ofertas que requieran guardias nocturnas').

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "insights": [
    "Regla de preferencia 1",
    "Regla de preferencia 2"
  ]
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        return res.get("insights", prefs.auto_learned_insights or [
            "Preferencia destacada por posiciones 100% remotas internacionales",
            "Afinidad por arquitecturas modernas y equipos autónomos"
        ])

preference_learner = PreferenceLearner()
