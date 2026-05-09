from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.report import ReportRequest
from app.services.report_service import ReportService
from app.core.email_service import send_report_email
from app.core.security import get_current_user
from datetime import datetime

router = APIRouter(
    prefix="/api/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_user)] # Solo usuarios autenticados pueden pedir reportes
)

@router.post("/send")
def send_report(
    request: ReportRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint para generar un reporte y enviarlo por correo.
    Se ejecuta en BackgroundTasks para no bloquear la respuesta al usuario mientras se genera/envía.
    """
    
    # 1. Obtener los datos filtrados
    detections = ReportService.get_filtered_data(
        db,
        camera_id=request.camera_id,
        gender=request.gender,
        start_date=request.start_date,
        end_date=request.end_date
    )
    
    if not detections:
        raise HTTPException(
            status_code=404, 
            detail="No se encontraron detecciones con los filtros seleccionados para generar el reporte."
        )

    # 2. Generar el contenido del archivo según el formato
    file_format = request.format.lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if file_format == "pdf":
        content = ReportService.generate_pdf(detections)
        filename = f"reporte_detecciones_{timestamp}.pdf"
    elif file_format == "excel":
        content = ReportService.generate_excel(detections)
        filename = f"reporte_detecciones_{timestamp}.xlsx"
    else:
        raise HTTPException(status_code=400, detail="Formato de reporte no soportado. Use 'pdf' o 'excel'.")

    # 3. Enviar correo (en segundo plano para una respuesta rápida de la API)
    background_tasks.add_task(
        send_report_email,
        to_email=request.email,
        filename=filename,
        content=content,
        file_format=file_format,
        message=request.message
    )

    return {
        "status": "success", 
        "message": f"El reporte {filename} se está procesando y será enviado a {request.email} en unos momentos."
    }
