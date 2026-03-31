import streamlit as st
import requests
import pandas as pd
import plotly.express as px
from datetime import datetime

API_URL = "http://app:8000"

st.set_page_config(
    page_title="Facial Recognition Dashboard",
    page_icon="📹",
    layout="wide"
)

def get_cameras():
    try:
        response = requests.get(f"{API_URL}/api/cameras/")
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_camera(camera_id):
    try:
        response = requests.get(f"{API_URL}/api/cameras/{camera_id}")
        return response.json() if response.status_code == 200 else None
    except:
        return None

def get_camera_status(camera_id):
    try:
        response = requests.get(f"{API_URL}/api/cameras/{camera_id}/status")
        return response.json() if response.status_code == 200 else None
    except:
        return None

def get_detections(camera_id=None, gender=None):
    try:
        params = {}
        if camera_id:
            params["camera_id"] = camera_id
        if gender:
            params["gender"] = gender
        response = requests.get(f"{API_URL}/api/detections/", params=params)
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_stats(camera_id=None):
    try:
        params = {}
        if camera_id:
            params["camera_id"] = camera_id
        response = requests.get(f"{API_URL}/api/detections/stats", params=params)
        return response.json() if response.status_code == 200 else None
    except:
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

def start_processing(camera_id):
    try:
        response = requests.post(f"{API_URL}/api/processing/start/{camera_id}")
        return response.status_code == 200
    except:
        return False

def stop_processing(camera_id):
    try:
        response = requests.post(f"{API_URL}/api/processing/stop/{camera_id}")
        return response.status_code == 200
    except:
        return False

def get_processing_status():
    try:
        response = requests.get(f"{API_URL}/api/processing/status")
        return response.json() if response.status_code == 200 else {}
    except:
        return {}

st.sidebar.title("Navegación")
page = st.sidebar.radio("Ir a", ["Dashboard", "Cámaras", "Detecciones"])

if page == "Dashboard":
    st.title("📊 Dashboard")
    st.write("Sistema de Análisis de Video con Estimación de Género")
    
    cameras = get_cameras()
    stats = get_stats()
    processing_status = get_processing_status()
    
    if stats:
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Detecciones", stats.get("total_detections", 0))
        with col2:
            st.metric("Hombres", stats.get("male_count", 0))
        with col3:
            st.metric("Mujeres", stats.get("female_count", 0))
        with col4:
            st.metric("Confianza Promedio", f"{stats.get('avg_confidence', 0):.2f}")
        
        st.divider()
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Distribución por Género")
            if stats.get("male_count", 0) > 0 or stats.get("female_count", 0) > 0:
                fig = px.pie(
                    values=[stats.get("male_count", 0), stats.get("female_count", 0)],
                    names=["Hombres", "Mujeres"],
                    color_discrete_sequence=["#3498db", "#e74c3c"]
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No hay detecciones registradas")
        
        with col2:
            st.subheader("Cámaras Registradas")
            if cameras:
                active_cameras = processing_status.get("active_cameras", [])
                active_ids = [c["camera_id"] for c in active_cameras]
                
                for cam in cameras:
                    is_active = cam["id"] in active_ids
                    status_icon = "🟢" if is_active else "⚪"
                    st.write(f"{status_icon} {cam['name']} - {cam['location'] or 'Sin ubicación'}")
            else:
                st.info("No hay cámaras registradas")
    
    st.divider()
    st.caption(f"Última actualización: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

elif page == "Cámaras":
    st.title("📹 Gestión de Cámaras")
    
    st.subheader("Agregar Nueva Cámara")
    
    camera_type = st.radio("Tipo de cámara", ["Webcam", "URL (RTSP/HTTP)"], horizontal=True)
    
    with st.form("add_camera"):
        col1, col2 = st.columns(2)
        with col1:
            name = st.text_input("Nombre *")
            if camera_type == "Webcam":
                url = st.selectbox("Dispositivo", ["0", "1"], help="0 = webcam principal, 1 = segunda webcam")
            else:
                url = st.text_input("URL (RTSP/HTTP) *", placeholder="rtsp://192.168.1.100:554/stream")
        with col2:
            location = st.text_input("Ubicación")
            if camera_type == "URL (RTSP/HTTP)":
                username = st.text_input("Usuario (opcional)")
                password = st.text_input("Contraseña (opcional)", type="password")
            else:
                username = None
                password = None
        
        submitted = st.form_submit_button("Agregar Cámara")
        
        if submitted:
            if name and url:
                if create_camera(name, url, location, username, password):
                    st.success("Cámara creada exitosamente!")
                    st.rerun()
                else:
                    st.error("Error al crear cámara")
            else:
                st.warning("Nombre y URL son requeridos")
    
    st.divider()
    
    st.subheader("Cámaras Registradas")
    cameras = get_cameras()
    processing_status = get_processing_status()
    active_cameras = processing_status.get("active_cameras", [])
    active_ids = [c["camera_id"] for c in active_cameras]
    
    if cameras:
        for cam in cameras:
            is_active = cam["id"] in active_ids
            status_info = get_camera_status(cam["id"])
            
            with st.expander(f"{'🟢' if is_active else '⚪'} {cam['name']} - {cam['location'] or 'Sin ubicación'}"):
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.write(f"**URL:** {cam['url']}")
                    st.write(f"**Estado:** {'Procesando' if is_active else 'Inactiva'}")
                    if status_info:
                        st.write(f"**Accesible:** {'Sí' if status_info.get('accessible') else 'No'}")
                    st.write(f"**Creado:** {cam['created_at'][:10]}")
                with col2:
                    if is_active:
                        if st.button(f"🛑 Detener", key=f"stop_{cam['id']}"):
                            if stop_processing(cam["id"]):
                                st.success("Detenida!")
                                st.rerun()
                    else:
                        if st.button(f"▶️ Iniciar", key=f"start_{cam['id']}"):
                            if start_processing(cam["id"]):
                                st.success("Iniciada!")
                                st.rerun()
                    
                    if st.button(f"🗑️ Eliminar", key=f"del_{cam['id']}"):
                        if delete_camera(cam["id"]):
                            st.success("Eliminada!")
                            st.rerun()
    else:
        st.info("No hay cámaras registradas")

elif page == "Detecciones":
    st.title("🔍 Detecciones")
    
    cameras = get_cameras()
    camera_options = {"Todas": None}
    for cam in cameras:
        camera_options[cam['name']] = cam['id']
    
    col1, col2 = st.columns(2)
    with col1:
        selected_camera = st.selectbox("Filtrar por cámara", options=camera_options.keys())
    with col2:
        gender_filter = st.selectbox("Filtrar por género", ["Todos", "male", "female"])
    
    camera_id = camera_options[selected_camera] if selected_camera != "Todas" else None
    gender = gender_filter if gender_filter != "Todos" else None
    
    detections = get_detections(camera_id=camera_id, gender=gender)
    
    st.divider()
    
    st.subheader(f"Detecciones ({len(detections)})")
    
    if detections:
        data = []
        for d in detections:
            cam = get_camera(d['camera_id'])
            cam_name = cam['name'] if cam else f"ID: {d['camera_id']}"
            data.append({
                "ID": d['id'],
                "Cámara": cam_name,
                "Género": d['gender'],
                "Confianza": d['confidence'],
                "Fecha": d['timestamp'][:10]
            })
        
        df = pd.DataFrame(data)
        st.dataframe(df, use_container_width=True)
        
        st.divider()
        
        col1, col2 = st.columns(2)
        with col1:
            st.subheader("Por Género")
            gender_counts = df['Género'].value_counts()
            fig1 = px.bar(x=gender_counts.index, y=gender_counts.values, 
                         labels={'x': 'Género', 'y': 'Cantidad'},
                         color=gender_counts.index)
            st.plotly_chart(fig1, use_container_width=True)
        
        with col2:
            st.subheader("Por Cámara")
            cam_counts = df['Cámara'].value_counts()
            fig2 = px.bar(x=cam_counts.index, y=cam_counts.values,
                         labels={'x': 'Cámara', 'y': 'Cantidad'})
            st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("No hay detecciones con los filtros seleccionados")
