import pandas as pd
from fpdf import FPDF
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.detection import Detection
from app.models.camera import Camera
from typing import Optional

class ReportService:
    @staticmethod
    def get_filtered_data(
        db: Session,
        camera_id: Optional[int] = None,
        gender: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ):
        """
        Obtiene los datos de detecciones de la base de datos aplicando los filtros proporcionados.
        Esta lógica es similar a la del endpoint de detecciones para mantener consistencia.
        """
        query = db.query(Detection).join(Camera)
        
        if camera_id:
            query = query.filter(Detection.camera_id == camera_id)
        if gender:
            query = query.filter(Detection.gender == gender)
        if start_date:
            query = query.filter(Detection.timestamp >= start_date)
        if end_date:
            query = query.filter(Detection.timestamp <= end_date)
            
        return query.order_by(Detection.timestamp.desc()).all()

    @staticmethod
    def generate_excel(detections) -> bytes:
        """
        Genera un archivo Excel en memoria a partir de una lista de detecciones.
        """
        data = []
        for det in detections:
            data.append({
                "ID": det.id,
                "Fecha/Hora": det.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "Cámara": det.camera.name or det.camera.hardware_label or f"ID: {det.camera_id}",
                "Género": "Hombre" if det.gender == "male" else "Mujer" if det.gender == "female" else det.gender,
                "Confianza": f"{round(det.confidence * 100, 2)}%"
            })
            
        df = pd.DataFrame(data)
        output = BytesIO()
        # Usamos context manager para asegurar que se guarde el archivo en el buffer
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Detecciones')
            
        return output.getvalue()

    @staticmethod
    def generate_pdf(detections) -> bytes:
        """
        Genera un reporte PDF profesional en memoria.
        Utiliza la librería fpdf2.
        """
        pdf = FPDF()
        pdf.add_page()
        
        # --- ENCABEZADO ---
        pdf.set_font("Arial", 'B', 16)
        pdf.set_text_color(56, 189, 248) # Color celeste BioFacial (#38bdf8)
        pdf.cell(0, 10, "Reporte de Detecciones BioFacial", ln=True, align='C')
        
        pdf.set_font("Arial", size=10)
        pdf.set_text_color(100, 116, 139) # Color gris
        fecha_gen = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        pdf.cell(0, 10, f"Generado el: {fecha_gen}", ln=True, align='C')
        pdf.ln(10)
        
        # --- TABLA DE DATOS ---
        # Cabeceras de la tabla
        pdf.set_fill_color(30, 41, 59) # Fondo oscuro (#1e293b)
        pdf.set_text_color(255, 255, 255) # Texto blanco
        pdf.set_font("Arial", 'B', 10)
        
        col_widths = [15, 45, 60, 35, 35]
        headers = ["ID", "Fecha/Hora", "Cámara", "Género", "Confianza"]
        
        for i in range(len(headers)):
            pdf.cell(col_widths[i], 10, headers[i], border=1, align='C', fill=True)
        pdf.ln()
        
        # Filas de la tabla
        pdf.set_font("Arial", size=9)
        pdf.set_text_color(0, 0, 0) # Texto negro
        
        for det in detections:
            # Color de fondo alternado para las filas
            pdf.set_fill_color(248, 250, 252)
            
            cam_name = det.camera.name or det.camera.hardware_label or f"ID: {det.camera_id}"
            gender_txt = "Hombre" if det.gender == "male" else "Mujer" if det.gender == "female" else det.gender
            conf_txt = f"{round(det.confidence * 100, 1)}%"
            
            pdf.cell(col_widths[0], 8, str(det.id), border=1, align='C')
            pdf.cell(col_widths[1], 8, det.timestamp.strftime("%Y-%m-%d %H:%M"), border=1, align='C')
            pdf.cell(col_widths[2], 8, cam_name[:30], border=1, align='L')
            pdf.cell(col_widths[3], 8, gender_txt, border=1, align='C')
            pdf.cell(col_widths[4], 8, conf_txt, border=1, align='C')
            pdf.ln()
            
        # Pie de página informativo
        pdf.ln(10)
        pdf.set_font("Arial", 'I', 8)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 10, "BioFacial © 2026 - Este documento es un reporte automático de seguridad.", align='R')
        
        # Retornar el contenido del PDF como bytes
        return pdf.output()
