# Propuesta de Arquitectura: Liveness Detection (Anti-Spoofing) Fisiológico en FrontEnd

## El Problema Actual (v2.2.0)
Si bien el Backend cuenta con algoritmos avanzados (DeepFace MiniFASNet) y heurísticas matriciales para clasificar "Suplantaciones" cuando alguien muestra una fotografía o pantalla, los ataques estáticos de ultra-alta fidelidad (impresiones mate en 4K o pantallas bajo brillo sin reflejos) aún pueden burlar el sistema.
La razón fundamental es que **el backend recibe una fotografía estática 1 vez cada 3 segundos**. Desde la perspectiva matemática de un fotograma aislado, es imposible diferenciar si el objeto está vivo o es una textura inanimada hiperrealista.

## La Solución Absoluta: Análisis Temporal
La prueba definitiva de vida es **fisiológica**: comprobar micro-movimientos o **parpadeos**. Para detectar un parpadeo (que toma 100~200 ms), el video debe escanearse de forma continua a ~30 FPS.
Dado que la red no debe colapsar mandando 30 peticiones HTTP por segundo al backend, esta tarea se debe delegar 100% al navegador web (FrontEnd).

## Herramienta Propuesta: MediaPipe Face Mesh (Google)
Integrar la librería `@mediapipe/tasks-vision` en `WebcamDetection.jsx`. Esta librería usa WebAssembly para rastrear 478 puntos tridimensionales del rostro sin afectar la memoria del Servidor Nube, usando solo el procesador del cliente/recepcionista.

### Flujo Operativo a Implementar

1. **Rastreo Silencioso:**
   El componente React lee el video local y MediaPipe extrae las coordenadas de los párpados superior e inferior.
2. **Cálculo de E.A.R. (Eye Aspect Ratio):**
   Matemáticamente calculamos la distancia entre párpados. Si la distancia cae por debajo de un umbral (`< 0.20`) durante 2 fotogramas continuos y luego se recupera (`> 0.25`), el sistema registra un evento booleano: `has_blinked = true`.
3. **Disparo Controlado:**
   El `setInterval` de 3 segundos que actualmente le dispara la foto ciega al Backend se elimina o se condiciona.
   Solo sí y solo sí `has_blinked === true` y ha pasado un tiempo prudencial (para garantizar que se enfocó el rostro), React congela ese instante y llama al servidor (`POST /api/detections/analyze_frame`).

### Beneficios Esperados
- **Tolerancia Cero a Fotografías:** Alguien sosteniendo un teléfono frente a la cámara jamás producirá una reducción natural e independiente del E.A.R., por lo que React nunca le enviará la foto a la Base de Datos.
- **Reducción de Peticiones Servidor:** Tu nube 1GB RAM no recibirá ataques basura; el procesador y la red se reservan exclusivamente para procesar humanos garantizados.

## Esfuerzo de Desarrollo (Siguiente Sprint)
- Modificación de: `frontend/src/components/WebcamDetection.jsx`
- Modificación de Backend: Ninguna. El backend se mantiene intacto ya que simplemente recibirá data más limpia.
