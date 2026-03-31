import streamlit as st
import requests
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import time
from PIL import Image
from io import BytesIO

API_URL = "http://app:8000"

st.set_page_config(
    page_title="Facial Recognition Dashboard",
    page_icon="📹",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# CSS PREMIUM & ESTILOS
# ============================================================
st.markdown("""
<style>
    /* Premium aesthetics for Streamlit app */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    .stApp {
        background-color: #0B0E14;
        color: #E2E8F0;
    }
    
    /* Header & Titles */
    h1, h2, h3 {
        color: #F8FAFC !important;
        font-weight: 800 !important;
        letter-spacing: -0.5px;
    }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #111827;
        border-right: 1px solid #1F2937;
    }
    
    /* Metrics */
    div[data-testid="stMetricValue"] {
        font-size: 2.8rem;
        font-weight: 800;
        background: -webkit-linear-gradient(45deg, #38BDF8, #818CF8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    div[data-testid="stMetricLabel"] {
        font-size: 1.1rem;
        color: #94A3B8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    div[data-testid="stMetric"] {
        background-color: #1E293B;
        padding: 1.5rem;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
        border: 1px solid #334155;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    div[data-testid="stMetric"]:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        border-color: #38BDF8;
    }

    /* Buttons */
    div.stButton > button {
        background: linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%);
        color: white;
        font-weight: 700;
        border: none;
        border-radius: 10px;
        padding: 0.6rem 1.2rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);
    }
    div.stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(14, 165, 233, 0.5);
    }
    div.stButton > button:active {
        transform: translateY(1px);
    }

    /* Video Stream Container */
    .video-container {
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
        border: 2px solid #334155;
        background: #000;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: border-color 0.3s ease;
    }
    .video-container:hover {
        border-color: #38BDF8;
    }
    
    /* Expander */
    .streamlit-expanderHeader {
        background-color: #1E293B !important;
        border-radius: 8px !important;
    }

    /* DataFrame */
    [data-testid="stDataFrame"] {
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #334155;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def get_cameras():
    try:
        response = requests.get(f"{API_URL}/api/cameras/", timeout=5)
        return response.json() if response.status_code == 200 else []
    except Exception as e:
        st.error(f"Error conectando a API: {e}")
        return []

def get_camera(camera_id):
    try:
        response = requests.get(f"{API_URL}/api/cameras/{camera_id}", timeout=5)
        return response.json() if response.status_code == 200 else None
    except:
        return None

def get_camera_status(camera_id):
    try:
        response = requests.get(f"{API_URL}/api/cameras/{camera_id}/status", timeout=5)
        return response.json() if response.status_code == 200 else None
    except:
        return None

def get_detections(camera_id=None, limit=100, gender=None):
    try:
        params = {"limit": limit}
        if camera_id:
            params["camera_id"] = camera_id
        if gender:
            params["gender"] = gender
        response = requests.get(f"{API_URL}/api/detections/", params=params, timeout=5)
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_stats(camera_id=None):
    try:
        params = {}
        if camera_id:
            params["camera_id"] = camera_id
        response = requests.get(f"{API_URL}/api/detections/stats", params=params, timeout=5)
        return response.json() if response.status_code == 200 else None
    except:
        return None

def get_processing_status():
    try:
        response = requests.get(f"{API_URL}/api/processing/status", timeout=5)
        return response.json() if response.status_code == 200 else {}
    except:
        return {}

def start_processing(camera_id):
    try:
        response = requests.post(f"{API_URL}/api/processing/start/{camera_id}", timeout=5)
        return response.json() if response.status_code == 200 else None
    except Exception as e:
        st.error(f"Error iniciando procesamiento: {e}")
        return None

def stop_processing(camera_id):
    try:
        response = requests.post(f"{API_URL}/api/processing/stop/{camera_id}", timeout=5)
        return response.json() if response.status_code == 200 else None
    except Exception as e:
        st.error(f"Error deteniendo procesamiento: {e}")
        return None

def create_camera(name, url, location, username=None, password=None):
    try:
        data = {"name": name, "url": url, "location": location}
        if username:
            data["username"] = username
        if password:
            data["password"] = password
        response = requests.post(f"{API_URL}/api/cameras/", json=data)
        return response.status_code == 200
    except:
        return False

def delete_camera(camera_id):
    try:
        response = requests.delete(f"{API_URL}/api/cameras/{camera_id}")
        return response.status_code == 200
    except:
        return False

# ============================================================
# NAVEGACIÓN PRINCIPAL
# ============================================================

st.sidebar.title("📹 Navegación")
page = st.sidebar.radio("Ir a", ["📊 Dashboard", "📹 Vista en Vivo", "⚙️ Gestión de Cámaras", "🎯 Detecciones"])
st.sidebar.divider()
st.sidebar.caption(f"Última actualización: {datetime.now().strftime('%H:%M:%S')}")

# ============================================================
# PÁGINA: DASHBOARD
# ============================================================
if page == "📊 Dashboard":
    st.title("Sistema de Análisis y Reconocimiento Facial")
    st.write("Visión general de las métricas en tiempo real.")
    
    cameras = get_cameras()
    stats = get_stats()
    processing_status = get_processing_status()
    
    if stats:
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Detecciones", stats.get("total_detections", 0))
        with col2:
            st.metric("Hombres Detectados", stats.get("male_count", 0))
        with col3:
            st.metric("Mujeres Detectadas", stats.get("female_count", 0))
        with col4:
            st.metric("Confianza Promedio", f"{stats.get('avg_confidence', 0):.1f}%")
        
        st.divider()
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.subheader("Distribución Geométrica")
            if stats.get("male_count", 0) > 0 or stats.get("female_count", 0) > 0:
                fig = px.pie(
                    values=[stats.get("male_count", 0), stats.get("female_count", 0)],
                    names=["Hombres", "Mujeres"],
                    color_discrete_sequence=["#38BDF8", "#F43F5E"],
                    hole=0.4
                )
                fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", font_color="#cbd5e1")
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No hay detecciones registradas")
        
        with col2:
            st.subheader("Estado de las Cámaras")
            if cameras:
                active_cameras = processing_status.get("active_cameras", [])
                active_ids = [c["camera_id"] for c in active_cameras]
                
                for cam in cameras:
                    is_active = cam["id"] in active_ids
                    status_icon = "🟢" if is_active else "⚪"
                    
                    with st.container():
                        st.markdown(f"""
                        <div style="background:#1E293B; padding:15px; border-radius:10px; margin-bottom:10px; border-left: 4px solid {'#10B981' if is_active else '#64748B'};">
                            <h4 style="margin:0;color:#F8FAFC;">{status_icon} {cam['name']}</h4>
                            <p style="margin:5px 0 0 0;color:#94A3B8;font-size:0.9em;">📍 {cam['location'] or 'Sin ubicación'}</p>
                        </div>
                        """, unsafe_allow_html=True)
            else:
                st.info("No hay cámaras registradas")

# ============================================================
# PÁGINA: VISTA EN VIVO
# ============================================================
elif page == "📹 Vista en Vivo":
    st.title("Visualización en Tiempo Real")
    st.write("Streaming directo procesado por el modelo usando tecnología MJPEG y Fast API.")
    
    cameras = get_cameras()
    processing_status = get_processing_status()
    active_cameras = processing_status.get("active_cameras", [])
    active_ids = [c["camera_id"] for c in active_cameras]
    
    if not cameras:
        st.warning("No hay cámaras registradas en el sistema.")
    else:
        cam_options = {f"{c['name']} ({c['location']}) - {'🟢 Activa' if c['id'] in active_ids else '⚪ Inactiva'}": c['id'] for c in cameras}
        selected_cam_name = st.selectbox("Selecciona una cámara para visualizar", list(cam_options.keys()))
        selected_id = cam_options[selected_cam_name]
        
        is_active = selected_id in active_ids
        
        if not is_active:
            st.error("⏸️ Esta cámara no está en procesamiento actualmente. Debes iniciarla en 'Gestión de Cámaras' o a continuación.")
            if st.button("▶️ Iniciar Procesamiento para esta cámara"):
                start_processing(selected_id)
                st.rerun()
        else:
            st.success("✅ Conectado y transmitiendo a 30 FPS.")
            
            import streamlit.components.v1 as components
            
            # External URL for the browser to reach the docker exposed port
            # Avoid using API_URL which resolves to docker internal network "app:8000"
            stream_url = f"http://localhost:8000/api/processing/video_feed/{selected_id}"
            
            # Use components.html instead of st.markdown to isolate the MJPEG stream in an iframe
            # This prevents React invariant violations when the stream keeps flowing
            raw_html = f'''
                <div style="width:100%; border-radius:12px; overflow:hidden; background-color:#000;">
                    <img src="{stream_url}" style="width:100%; object-fit: cover;" alt="Cargando Stream..." />
                </div>
            '''
            components.html(raw_html, height=480)
            
            # Estadísticas debajo de la cámara
            stats = get_stats(camera_id=selected_id)
            if stats:
                st.divider()
                st.subheader("Rendimiento del Nodo")
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Detecciones Históricas", stats.get("total_detections", 0))
                with col2:
                    st.metric("Hombres", stats.get("male_count", 0))
                with col3:
                    st.metric("Mujeres", stats.get("female_count", 0))
                with col4:
                    st.metric("Confiabilidad Modelo", f"{stats.get('avg_confidence', 0):.1f}%")

# ============================================================
# PÁGINA: GESTIÓN DE CÁMARAS
# ============================================================
elif page == "⚙️ Gestión de Cámaras":
    st.title("Gestión de Cámaras")
    
    with st.expander("➕ Agregar Nueva Cámara", expanded=False):
        camera_type = st.radio("Tipo de cámara", ["Webcam Local", "Cámara IP / URL RTSP"], horizontal=True)
        
        with st.form("add_camera"):
            col1, col2 = st.columns(2)
            with col1:
                name = st.text_input("Nombre de Referencia *")
                if camera_type == "Webcam Local":
                    url = st.selectbox("ID Dispositivo", ["0", "1", "2"], help="0 = principal, 1 = extra")
                else:
                    url = st.text_input("URL Stream (RTSP/HTTP) *", placeholder="rtsp://usuario:pass@ip:554/stream")
            with col2:
                location = st.text_input("Ubicación Física")
                if camera_type == "Cámara IP / URL RTSP":
                    username = st.text_input("Usuario (Opcional)")
                    password = st.text_input("Contraseña (Opcional)", type="password")
                else:
                    username = None
                    password = None
            
            submitted = st.form_submit_button("Guardar Cámara")
            
            if submitted:
                if name and url:
                    if create_camera(name, url, location, username, password):
                        st.success("¡Cámara registrada exitosamente!")
                        time.sleep(1)
                        st.rerun()
                    else:
                        st.error("Error al registrar la cámara en la base de datos.")
                else:
                    st.warning("⚠️ El Nombre y la URL son campos obligatorios.")

    st.subheader("Dispositivos Registrados")
    cameras = get_cameras()
    processing_status = get_processing_status()
    active_ids = [c["camera_id"] for c in processing_status.get("active_cameras", [])]
    
    if cameras:
        for cam in cameras:
            is_active = cam["id"] in active_ids
            status_info = get_camera_status(cam["id"])
            
            with st.container():
                with st.expander(f"{'🟢 Trabajando' if is_active else '⚪ Inactiva'} - {cam['name']} ({cam['location']})", expanded=True):
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.write(f"**🔗 Endpoint URL:** `{cam['url']}`")
                        st.write(f"**📅 Alta:** `{cam['created_at'][:10]}`")
                        
                        if status_info:
                            accesible = status_info.get('accessible')
                            st.write(f"**📶 Conectividad:** {'✅ Online' if accesible else '❌ Offline'}")
                            
                    with col2:
                        st.write("**Acciones:**")
                        if is_active:
                            if st.button(f"🛑 Detener", key=f"stop_{cam['id']}", use_container_width=True):
                                stop_processing(cam["id"])
                                st.rerun()
                        else:
                            if st.button(f"▶️ Iniciar", key=f"start_{cam['id']}", use_container_width=True):
                                start_processing(cam["id"])
                                st.rerun()
                        
                        st.write("")
                        if st.button(f"🗑️ Eliminar", key=f"del_{cam['id']}", use_container_width=True, type="primary"):
                            delete_camera(cam["id"])
                            st.rerun()
    else:
        st.info("Aún no tienes cámaras registradas. Comienza agregando una arriba.")

# ============================================================
# PÁGINA: DETECCIONES E HISTORIAL
# ============================================================
elif page == "🎯 Detecciones":
    st.title("Historial de Detecciones")
    
    cameras = get_cameras()
    camera_options = {"Todas las cámaras": None}
    for cam in cameras:
        camera_options[cam['name']] = cam['id']
    
    col1, col2, col3 = st.columns([2, 2, 1])
    with col1:
        selected_camera = st.selectbox("Filtrar por nodo", options=list(camera_options.keys()))
    with col2:
        gender_filter = st.selectbox("Análisis de género", ["Todos", "male", "female"])
    with col3:
        limit_docs = st.number_input("Resultados", min_value=10, max_value=5000, value=100)
    
    camera_id = camera_options[selected_camera]
    gender = gender_filter if gender_filter != "Todos" else None
    
    detections = get_detections(camera_id=camera_id, limit=limit_docs, gender=gender)
    
    st.divider()
    
    if detections:
        data = []
        for d in detections:
            cam_name = next((c['name'] for c in cameras if c['id'] == d['camera_id']), f"ID: {d['camera_id']}")
            data.append({
                "ID Trace": f"#{d['id']}",
                "Origen": cam_name,
                "Identidad": "Hombre 👨" if d['gender'] == "male" else "Mujer 👩",
                "Precisión": f"{d['confidence']*100:.1f}%",
                "Timestamp": d['timestamp'][:19].replace("T", " ")
            })
        
        df = pd.DataFrame(data)
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        st.divider()
        st.subheader("Análisis Temporal Rápido")
        
        col_chart1, col_chart2 = st.columns(2)
        with col_chart1:
            gender_counts = df['Identidad'].value_counts()
            fig1 = px.bar(x=gender_counts.index, y=gender_counts.values, 
                         color=gender_counts.index,
                         color_discrete_sequence=["#38BDF8", "#F43F5E"],
                         labels={'x': 'Género', 'y': 'Volumen'})
            fig1.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#cbd5e1")
            st.plotly_chart(fig1, use_container_width=True)
        
        with col_chart2:
            cam_counts = df['Origen'].value_counts()
            fig2 = px.bar(x=cam_counts.index, y=cam_counts.values,
                         labels={'x': 'Nodo CCTV', 'y': 'Tráfico detectado'})
            fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#cbd5e1")
            st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("No se hallaron detecciones que coincidan con estos parámetros.")
