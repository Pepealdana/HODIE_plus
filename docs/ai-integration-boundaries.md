# HODIE / HODIE_plus: límites de arquitectura e integración de IA

**Estado:** propuesta inicial para revisión  
**Ámbito:** contrato entre el producto pedagógico HODIE y el entorno de experimentación HODIE_plus  
**Regla principal:** ningún proveedor de IA puede convertirse en fuente de verdad pedagógica ni modificar el progreso del estudiante sin validación de HODIE.

## 1. Propósito

Este documento fija responsabilidades, fronteras de datos y criterios mínimos de aceptación para evitar que ambos repositorios evolucionen con contratos incompatibles. Se debe actualizar cuando cambien los esquemas, los proveedores, los criterios pedagógicos o las pruebas.

Los nombres de módulos que siguen describen responsabilidades arquitectónicas. No implican que todos existan ya como módulos físicos independientes; parte de la lógica actual vive en `app.js` y en archivos de `data/`, y su extracción debe hacerse de forma incremental.

## 2. Responsabilidades por repositorio

### HODIE — fuente de verdad pedagógica

HODIE mantiene la autoridad sobre:

- Biblioteca y catálogo lingüístico: vocabulario, estructuras, reglas, funciones comunicativas, ejemplos y criterios de activación.
- Modelos de contenido, actividad y taxonomía.
- Objetivos de aprendizaje, nivel objetivo y progresión.
- Evidencia observable, evaluación de respuestas, detección/registro de errores y memoria de errores.
- Retroalimentación pedagógica, oportunidades de aprendizaje y reintentos.
- Estado de sesión, historial y progreso persistente del estudiante.
- Experiencia principal, accesibilidad, funcionamiento local-first y PWA.

**HODIE decide** qué evidencia es válida, qué reglas están activas, cómo se interpreta una respuesta, qué se guarda y cómo se calcula el progreso.

### HODIE_plus — experimentación y adaptadores de IA

HODIE_plus se responsabiliza de:

- Adaptadores específicos de cada proveedor de IA.
- Normalización de solicitudes y respuestas hacia un contrato común.
- Pruebas comparativas de calidad, latencia, coste, disponibilidad y fallos.
- Generación experimental de explicaciones, diálogos, variantes de ejercicios y sugerencias.
- Validación de salida, límites de tamaño, tiempos de espera, reintentos y tratamiento de errores.
- Evaluación de resultados contra casos de referencia pedagógicos.
- Registro técnico de proveedor/modelo y metadatos de evaluación, sin almacenar secretos ni datos personales innecesarios.

HODIE_plus **no** debe modificar directamente la biblioteca oficial, declarar por sí mismo que un estudiante dominó una competencia, cambiar niveles, escribir en el progreso oficial ni reemplazar reglas validadas.

### Responsabilidades compartidas mediante contrato

Ambos proyectos pueden compartir definiciones versionadas de:

- Esquema de solicitud y respuesta de IA.
- Identificadores estables de habilidades, actividades, errores y objetivos.
- Formato de evidencia y criterios de validación.
- Casos de prueba de regresión pedagógica.
- Política de privacidad y reglas de manejo de datos.

Hasta que exista un paquete compartido, los contratos se documentan aquí y se protegen con pruebas de compatibilidad. No se deben copiar y modificar de forma independiente sin registrar una versión.

## 3. Módulos lógicos y propiedad

| Módulo lógico | Propietario | Puede recibir de IA | Autoridad final |
|---|---|---|---|
| Biblioteca lingüística y reglas validadas | HODIE | Propuestas de nuevos ejemplos o reglas, nunca cambios automáticos | HODIE |
| Modelo de contenido y actividades | HODIE | Borradores de actividades con esquema explícito | HODIE |
| Generador/orquestador de sesiones | HODIE | Variantes o sugerencias acotadas | HODIE |
| Evaluación de respuesta y evidencia | HODIE | Análisis auxiliar con razones e incertidumbre | HODIE |
| Motor de errores y memoria | HODIE | Hipótesis de error para contrastar | HODIE |
| Progresión y estado del estudiante | HODIE | Ninguna escritura directa | HODIE |
| Interfaz y PWA | HODIE | Contenido aprobado y validado | HODIE |
| Adaptador de proveedor | HODIE_plus | Acceso al proveedor configurado | HODIE_plus |
| Normalizador/validador de salida de IA | HODIE_plus; contrato compartido | Respuesta sin procesar del proveedor | Validación técnica en HODIE_plus; validación pedagógica en HODIE |
| Banco de evaluación comparativa de IA | HODIE_plus, con casos pedagógicos versionados | Respuestas de distintos proveedores | Criterios aprobados conjuntamente |
| Integración de propuesta aceptada | HODIE, mediante cambio revisado | Resultado ya validado | HODIE |

## 4. Flujo de datos previsto

1. HODIE prepara una solicitud mínima con el objetivo pedagógico, la actividad permitida, el contexto estrictamente necesario y la versión del contrato.
2. HODIE_plus transforma la solicitud al formato específico del proveedor.
3. El proveedor devuelve una respuesta no confiable; se trata como contenido externo, no como instrucciones de sistema ni como verdad.
4. El adaptador normaliza la respuesta y verifica estructura, tipos, límites y campos requeridos.
5. HODIE valida la pertinencia pedagógica, la corrección lingüística, la seguridad y la compatibilidad con las reglas activas.
6. Solo tras esa validación, HODIE decide si muestra el contenido, lo ofrece como borrador o lo descarta.
7. La evidencia de aprendizaje y el progreso se calculan y guardan exclusivamente mediante la lógica oficial de HODIE.

Si la IA no está disponible, devuelve contenido inválido o no supera la validación, la aplicación debe poder rechazar la respuesta y conservar un flujo de práctica no dependiente de IA cuando exista una alternativa local.

## 5. Contrato mínimo de intercambio

El esquema definitivo debe contrastarse con `data/ai-provider-contract.json` y `tests/ai-provider-contract.test.js` antes de cambiarlo. Esta sección establece los campos conceptuales mínimos; no pretende sustituir el esquema ejecutable.

### Solicitud conceptual

- `contractVersion`: versión explícita del contrato.
- `requestId`: identificador de correlación no personal.
- `taskType`: tarea permitida (por ejemplo, `explain`, `generate_activity`, `suggest_feedback`).
- `languageLevel`: nivel objetivo si aplica; no lo decide el proveedor.
- `learningObjective`: objetivo aprobado por HODIE.
- `input`: texto del estudiante o contexto necesario, minimizado.
- `constraints`: idioma de respuesta, longitud, formato y restricciones pedagógicas.
- `referenceIds`: identificadores de reglas, habilidades o actividades pertinentes, si existen.
- `outputSchema`: forma esperada de la respuesta.

No enviar claves, tokens, información personal innecesaria, historial completo por defecto ni datos sensibles. No incluir secretos en el repositorio, prompts, trazas ni pruebas.

### Respuesta conceptual normalizada

- `contractVersion`: versión que entiende el adaptador.
- `requestId`: correlación con la solicitud.
- `status`: `ok`, `refused`, `unavailable` o `invalid`.
- `taskType`: debe coincidir con la solicitud.
- `result`: contenido propuesto por la IA, con el formato específico de la tarea.
- `rationale`: explicación breve opcional; no se trata como evidencia suficiente.
- `uncertainty`: señal opcional de incertidumbre, nunca una calificación oficial.
- `provider` y `model`: metadatos técnicos no secretos.
- `warnings`: problemas detectados por el adaptador.
- `usage`: métricas técnicas opcionales, sin incluir contenido personal.

La respuesta no puede escribir directamente campos como progreso, dominio, nivel alcanzado, historial oficial o estado de sesión. Los campos desconocidos deben rechazarse o ignorarse según una política documentada; no deben propagarse silenciosamente.

## 6. Pruebas obligatorias para cada proveedor de IA

Cada proveedor/adaptador debe superar los grupos siguientes antes de ser candidato a integración.

### A. Contrato y esquema

- Acepta solicitudes válidas y rechaza solicitudes incompletas o mal formadas.
- Normaliza la respuesta a un esquema común.
- Maneja campos ausentes, tipos incorrectos, JSON inválido, contenido vacío y campos inesperados.
- No cambia la versión de contrato silenciosamente.
- Conserva la correlación de `requestId` y no confunde respuestas de solicitudes distintas.

### B. Corrección lingüística y pedagógica

- Casos positivos: acepta respuestas adecuadas para el objetivo y nivel definidos.
- Casos negativos: detecta errores deliberados y evita aprobar explicaciones o ejemplos incorrectos.
- Adecuación al nivel: no introduce complejidad innecesaria ni cambia el objetivo de aprendizaje.
- Consistencia: ante entradas equivalentes, no contradice reglas oficiales sin justificación.
- Trazabilidad: relaciona las sugerencias con los objetivos o referencias proporcionados cuando corresponda.
- No inventa evidencia: una explicación fluida no equivale a demostrar que el estudiante domina una habilidad.

### C. Seguridad y límites

- Trata texto del usuario y salida del proveedor como datos no confiables.
- Resiste instrucciones incrustadas que intenten anular la tarea o revelar información.
- No revela secretos, prompts internos ni datos de otros estudiantes.
- Rechaza contenido fuera del ámbito permitido y evita retroalimentación humillante o discriminatoria.
- Respeta límites de longitud, tipos de salida y contenido.
- No ejecuta código ni acciones externas a partir de texto generado.

### D. Fallos y resiliencia

- Simula timeout, desconexión, límite de cuota, error HTTP, respuesta vacía y error del proveedor.
- Usa reintentos limitados y evita bucles o duplicación de acciones.
- Devuelve un error normalizado, sin filtrar credenciales ni trazas sensibles.
- La interfaz mantiene un estado recuperable y permite reintentar o usar una alternativa local.
- Una falla de IA nunca corrompe el estado, la memoria de errores ni el progreso oficial.

### E. Privacidad y coste operativo

- Envía únicamente los campos necesarios para la tarea.
- No registra texto personal completo ni secretos en logs.
- Permite identificar proveedor/modelo, latencia y consumo cuando el proveedor los ofrece.
- Tiene límites configurados de tamaño, tiempo, frecuencia y coste.
- Documenta qué datos salen del dispositivo y qué proveedor los procesa.

### F. Regresión e integración

- Ejecuta el conjunto completo de pruebas de HODIE.
- Pasa los tests de contrato de IA y los casos de regresión pedagógica.
- No altera resultados del motor determinista ni la progresión por introducir IA.
- Compara la salida del proveedor con casos de referencia antes de aprobar cambios de modelo.
- Verifica la experiencia sin conexión y el comportamiento cuando no hay proveedor configurado.

## 7. Criterios de aceptación y rechazo

Un adaptador puede considerarse **apto para experimento** si pasa las pruebas técnicas y de seguridad aplicables y sus resultados quedan documentados.

Solo puede considerarse **apto para integración** si, además:

1. No hay fallos críticos de privacidad, seguridad o corrupción del estado.
2. Pasa todos los casos obligatorios del contrato.
3. Cumple el umbral de calidad pedagógica definido para la tarea concreta.
4. No empeora regresiones lingüísticas o de nivel ya validadas.
5. Tiene fallos recuperables y un comportamiento definido sin conexión o sin proveedor.
6. Se revisa el cambio de código y se documentan proveedor, modelo, fecha y conjunto de pruebas.

Los umbrales numéricos de calidad, latencia y coste quedan **pendientes de definir por tipo de tarea**. No se deben inventar cifras universales: explicar una regla y evaluar una respuesta son tareas diferentes.

## 8. Versionado y cambios compatibles

- Cada cambio de contrato debe actualizar el esquema, las pruebas y este documento en el mismo cambio revisable.
- Cambios incompatibles requieren nueva versión mayor del contrato y una migración explícita.
- Campos opcionales nuevos pueden ser compatibles solo si el consumidor los ignora de forma segura.
- No se cambia un identificador pedagógico estable por conveniencia de un proveedor.
- Las pruebas de compatibilidad deben comprobar que HODIE_plus puede consumir el contrato aprobado por HODIE.
- La adopción de un proveedor o modelo nuevo no autoriza a cambiar los criterios de aprendizaje.
- Los cambios se integran mediante PR o revisión equivalente; no se sincronizan repositorios completos de forma ciega.

## 9. Matriz de pruebas a mantener

| Grupo | Ubicación actual de referencia | Qué demuestra |
|---|---|---|
| Contrato de proveedor IA | `data/ai-provider-contract.json`, `tests/ai-provider-contract.test.js` | Compatibilidad de estructura y límites |
| Arquitectura de aprendizaje | `tests/learning-architecture.test.js` | Respeto de las fronteras internas |
| Orquestación de aprendizaje | `tests/learning-orchestrator.test.js` | Coordinación de actividades |
| Evidencia y límites | `tests/evidence-boundary.test.js` | La evidencia no se infiere arbitrariamente |
| Motor de errores y retroalimentación | `tests/error-engine.test.js`, `tests/feedback-contract.test.js`, `tests/error-memory.test.js` | Consistencia de evaluación y feedback |
| Integración de sesiones | `tests/session-runner.test.js`, `tests/learning-session.test.js` | Comportamiento de extremo a extremo |
| Regresión lingüística | `tests/linguistic-engine.test.js`, `tests/linguistic-ui-integration.test.js` | Corrección y compatibilidad de reglas |
| PWA y runtime | `tests/pwa-contract.test.js`, `tests/app-runtime.test.js` | Resiliencia de la aplicación |

La presencia de un test no garantiza por sí sola que cubra todos los escenarios descritos. Al implementar un proveedor nuevo, se deben revisar los casos existentes y agregar pruebas explícitas para las brechas identificadas.

## 10. Decisiones pendientes antes de conectar proveedores

- Inventario de herramientas RunOnWeb por evaluar; la primera fase cubre Scribe (voz-a-texto) y Voice (texto-a-voz).
- Tareas que cada proveedor puede ejecutar y tareas prohibidas.
- Esquema ejecutable definitivo y política de compatibilidad.
- Umbrales de calidad por tarea, coste y latencia.
- Política de almacenamiento, consentimiento y retención para solicitudes enviadas a servicios externos.
- Mecanismo de configuración de credenciales fuera del repositorio.
- Si HODIE_plus consumirá el contrato mediante copia versionada, paquete compartido o integración por adaptador.

## 11. Lista de verificación por proveedor

- [ ] Proveedor, modelo, versión y tareas permitidas documentados.
- [ ] Contrato y validación de entrada/salida implementados.
- [ ] Casos positivos y negativos de regresión pedagógica superados.
- [ ] Inyección de instrucciones y salida maliciosa probadas.
- [ ] Timeout, cuota, desconexión y respuesta inválida probados.
- [ ] Privacidad, logs, límites de coste y credenciales revisados.
- [ ] Sin escritura directa sobre progreso o datos maestros de HODIE.
- [ ] Pruebas de integración y suite completa de HODIE superadas.
- [ ] Resultado registrado como experimento, aprobado o rechazado, con evidencia.

---

**Principio de cierre:** la IA puede proponer, explicar y generar variantes. HODIE conserva la decisión pedagógica y el registro oficial del aprendizaje.


## 12. Implementación ejecutable del contrato v1.0.0

El contrato ejecutable se mantiene en `data/ai-provider-contract.json`; sus validadores de entrada/salida están en `src/ai-provider-contract.js`, y sus pruebas en `tests/ai-provider-contract.test.js`.

La interfaz real de proveedores en v1.0.0 es deliberadamente asimétrica:
- `rule-based`: `start`, `respond`, `advance`.
- `ai`: `respond`, que debe devolver una respuesta normalizada.

`analyze` es un tipo de tarea (`analyze_interaction`), no un método obligatorio de proveedor. `finish` no es método de proveedor: completar sesiones y decidir si una evaluación puede producir evidencia es responsabilidad de los módulos de sesión y de `src/evidence-boundary.js`.

### Sobre la validación

Los validadores actuales comprueban forma, campos, versión, tarea, correlación y límites básicos. No garantizan por sí mismos que el contenido generado sea lingüísticamente correcto, seguro o pedagógicamente apropiado. Esa validación de contenido y la revisión humana siguen siendo necesarias antes de integrar un proveedor externo en producción.

### Criterio de estado

`contract-implemented` significa que existe un contrato versionado con validadores ejecutables y pruebas unitarias; no significa que haya un proveedor de IA de producción conectado, que los secretos estén configurados ni que se haya certificado la calidad pedagógica de un modelo.


## 13. Experimento inicial RunOnWeb: capacidades locales de voz

Se añadió un laboratorio aislado en `runonweb-lab.html` y `runonweb-lab.js`. Importa los módulos oficiales `runonweb/stt` y `runonweb/tts` para evaluar dos capacidades concretas:

- **Scribe:** graba una respuesta breve mediante el micrófono del navegador y la transcribe localmente.
- **Voice:** genera audio de una frase modelo en inglés y permite reproducirlo.

El adaptador `src/providers/runonweb-capabilities.js` encapsula carga, transcripción, síntesis, errores y liberación de recursos. No se presenta como proveedor conversacional: estos módulos no sustituyen un modelo generativo capaz de mantener un diálogo pedagógico. Tampoco escribe progreso, historial oficial ni evidencia.

La página carga el código de los módulos desde esm.sh; los modelos ejecutan la inferencia en el navegador y descargan pesos la primera vez. Esto evita llamadas a una API de IA por solicitud, pero requiere conexión inicial, almacenamiento y memoria del dispositivo. La compatibilidad de la carga por CDN y de los formatos de audio debe comprobarse en la prueba manual del navegador publicado.

Las pruebas automatizadas `tests/runonweb-capabilities.test.js` y `tests/runonweb-lab-contract.test.js` validan el contrato con módulos simulados y la presencia de los controles del laboratorio. No descargan modelos ni sustituyen la validación manual de audio, idiomas, rendimiento, permisos del micrófono y funcionamiento en móvil.
