# 📊 Dashboard Interactivo - Documentación Técnica

## Descripción General
El Dashboard Interactivo es el módulo central de visualización de datos de **GenderSense**. Utiliza análisis demográfico en tiempo real para presentar el flujo de personas, la distribución de género y la confianza de las detecciones mediante una interfaz moderna basada en **Glassmorphism**.

---

## Componentes Clave

### 1. Métricas en Tiempo Real (Top Cards)
- **Detecciones Totales**: Conteo acumulado de todas las detecciones en la base de datos.
- **Confianza Promedio**: Nivel de precisión medio de la IA en la identificación de género.
- **Distribución por Género**: Conteo absoluto de hombres y mujeres detectados.

### 2. Siluetas Líquidas (Gender Liquid Ratio)
Ubicadas una al lado de la otra, representan el porcentaje de hombres vs mujeres.
- **Tecnología**: SVG con `mask-image` y animaciones CSS de ondas (`wave`).
- **Efecto**: El "líquido" sube o baja dinámicamente según los datos de la API.
- **Colores**: 
  - 🔵 **Hombres**: Gradiente de azul (`#0284c7` a `#38bdf8`).
  - 💗 **Mujeres**: Gradiente de rosado (`#be185d` a `#f472b6`).

### 3. Gráfica de Tendencia (Hourly Trend)
Muestra la frecuencia de detecciones en las últimas 24 horas.
- **Librería**: `recharts` (AreaChart).
- **Agrupación**: Los datos se agrupan por hora desde el backend usando `date_trunc`.

### 4. Feed de Actividad Reciente
Lista las últimas 5 detecciones con:
- Icono de género.
- ID de la cámara.
- Porcentaje de confianza.
- Hora exacta.

---

## Implementación Técnica

### Backend (FastAPI)
- **Endpoint**: `GET /api/detections/stats`
- **Lógica**: Realiza una consulta SQL agrupada por `hour` para los últimos 24 intervalos.
- **Modelo**: SQLAlchemy con funciones de fecha de Postgres.

### Frontend (React)
- **Estado**: `useStats` y `useRecentDetections`.
- **Intervalo**: Actualización automática cada 30 segundos (`setInterval`).
- **Estilos**: Definidos en `index.css` bajo la sección `/* ==================== Dashboard Styles ==================== */`.

---

## Uso y Navegación
- El Dashboard es ahora la **página de inicio** por defecto al iniciar sesión.
- Se puede acceder en cualquier momento desde el icono de **LayoutDashboard** en el menú lateral.
