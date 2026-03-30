# Proyecto: Sistema de Análisis de Video con Estimación de Género

## 1. Introducción

Este proyecto consiste en el desarrollo de una aplicación basada en
visión por computadora capaz de analizar video en tiempo real para
detectar rostros y estimar la presentación de género con fines
analíticos.

## 2. Objetivos

### Objetivo General

Desarrollar una solución robusta para procesamiento de video y análisis
facial.

### Objetivos Específicos

-   Capturar video desde múltiples fuentes
-   Detectar rostros en tiempo real
-   Estimar atributos faciales
-   Almacenar datos en base de datos
-   Exportar información a Excel

## 3. Tecnologías

-   Python
-   FastAPI
-   OpenCV
-   ONNX Runtime
-   PostgreSQL
-   Docker
-   Streamlit (Frontend/Dashboard)

## 4. Arquitectura

Sistema basado en microservicios:
- **app**: FastAPI (API REST)
- **db**: PostgreSQL (Base de datos)
- **frontend**: Streamlit (Dashboard interactivo)
- **worker**: Procesamiento de visión (fase posterior)
- **redis**: Cola/cache (fase posterior)

## 5. Casos de Uso

### CU1: Registro de detección

El sistema detecta un rostro y registra la predicción.

### CU2: Consulta de datos

El usuario consulta registros por fecha o cámara.

### CU3: Exportación

El usuario descarga datos en Excel.

### CU4: Monitoreo

Procesamiento continuo de video.

## 6. Fases del proyecto

-   Definición
-   Diseño
-   Base de datos
-   Docker
-   PoC visión
-   Backend
-   Exportación
-   Optimización
-   Pruebas

## 7. Consideraciones éticas

El sistema no determina identidad de género, solo inferencias visuales.

## 8. Conclusión

El sistema permite análisis automatizado de video con arquitectura
escalable.
