import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuración SMTP desde variables de entorno (SMTP_USER y SMTP_PASSWORD se encuentran en el archivo .env)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8501")

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Envía un correo con el enlace para restablecer la contraseña.
    
    Construye un enlace con el token JWT de reset que expira en 15 minutos.
    El enlace apunta al frontend donde el usuario ingresa su nueva contraseña.
    """
    reset_link = f"{FRONTEND_URL}/?reset_token={reset_token}"
    
    subject = "🔐 GenderSense - Recuperación de Contraseña"
    
    # Cuerpo HTML del correo con diseño oscuro
    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #38bdf8; margin: 0;">🔐 GenderSense</h1>
            <p style="color: #94a3b8; margin-top: 0.25rem;">Sistema de Reconocimiento Facial</p>
        </div>
        
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
        
        <div style="text-align: center; margin: 2rem 0;">
            <a href="{reset_link}" style="background: linear-gradient(135deg, #38bdf8, #818cf8); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1rem;">
                Restablecer Contraseña
            </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 0.85rem;">Este enlace expira en <strong>15 minutos</strong>. Si no solicitaste este cambio, ignora este correo.</p>
        
        <hr style="border: 1px solid #334155; margin: 1.5rem 0;">
        <p style="color: #64748b; font-size: 0.75rem; text-align: center;">GenderSense © 2026 — Solo personal autorizado</p>
    </div>
    """
    
    try:
        # Crear mensaje multipart (HTML + texto plano de fallback)
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        
        # Versión texto plano como fallback
        text_body = f"Recupera tu contraseña visitando: {reset_link}\nEste enlace expira en 15 minutos."
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        # Conectar y enviar via SMTP con TLS
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        
        print(f"📧 Correo de recuperación enviado a: {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Error enviando correo: {e}")
        # Fallback: imprimir enlace en logs para desarrollo
        print(f"📋 Enlace de recuperación (fallback): {reset_link}")
        return False
