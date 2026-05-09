import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

logger = logging.getLogger(__name__)

# Configuración SMTP desde variables de entorno
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8501")


def _is_smtp_configured() -> bool:
    """Verifica si las credenciales SMTP están configuradas."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("⚠️ SMTP no configurado: SMTP_USER o SMTP_PASSWORD están vacíos. Correos deshabilitados.")
        return False
    return True


def _send_email(to_email: str, subject: str, html_body: str, text_body: str, attachments: list = None) -> bool:
    """Función base para enviar correos via SMTP con TLS.
    
    Maneja la conexión SMTP, autenticación y envío.
    Soporta una lista opcional de adjuntos: [(filename, content, mimetype), ...]
    """
    if not _is_smtp_configured():
        print(f"⚠️ Correo NO enviado a {to_email} (SMTP no configurado)")
        return False
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        # Procesar adjuntos si existen
        if attachments:
            for filename, content, mimetype in attachments:
                part = MIMEApplication(content)
                part.add_header('Content-Disposition', 'attachment', filename=filename)
                msg.attach(part)
        
        print(f"📧 Conectando a {SMTP_HOST}:{SMTP_PORT}...")
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        
        print(f"✅ Correo enviado exitosamente a: {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Error de autenticación SMTP: {e}")
        print("   Verifica que SMTP_USER y SMTP_PASSWORD sean correctos.")
        print("   Para Gmail, necesitas un App Password (no tu contraseña normal).")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        print(f"❌ Destinatario rechazado ({to_email}): {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ Error SMTP al enviar a {to_email}: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado enviando correo a {to_email}: {type(e).__name__}: {e}")
        return False


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Envía un correo con el enlace para restablecer la contraseña.
    
    El enlace contiene un token JWT que expira en 5 minutos.
    """
    reset_link = f"{FRONTEND_URL}/?reset_token={reset_token}"
    
    subject = "🔐 BioFacial - Recuperación de Contraseña" 
    
    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #38bdf8; margin: 0;">🔐 BioFacial</h1>
            <p style="color: #94a3b8; margin-top: 0.25rem;">Sistema de Reconocimiento Facial</p>
        </div>
        
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
        
        <div style="text-align: center; margin: 2rem 0;">
            <a href="{reset_link}" style="background: linear-gradient(135deg, #38bdf8, #818cf8); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1rem;">
                Restablecer Contraseña
            </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 0.85rem;">Este enlace expira en <strong>5 minutos</strong>. Si no solicitaste este cambio, ignora este correo.</p>
        
        <hr style="border: 1px solid #334155; margin: 1.5rem 0;">
        <p style="color: #64748b; font-size: 0.75rem; text-align: center;">BioFacial © 2026 — Solo personal autorizado</p>
    </div>
    """
    
    text_body = f"Recupera tu contraseña visitando: {reset_link}\nEste enlace expira en 5 minutos."
    
    success = _send_email(to_email, subject, html_body, text_body)
    
    if not success:
        # Fallback: imprimir enlace en logs para desarrollo local
        logger.info(f"📋 Enlace de recuperación (fallback para dev): {reset_link}")
    
    return success


def send_welcome_email(to_email: str, username: str, auth_method: str = "Google") -> bool:
    """Envía un correo de bienvenida cuando un usuario se auto-registra.
    
    Se envía cuando un usuario nuevo entra por primera vez via Google OAuth
    y su cuenta se crea automáticamente.
    """
    subject = "🎉 ¡Bienvenido a BioFacial!"
    
    login_link = FRONTEND_URL
    
    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #38bdf8; margin: 0;">🎉 ¡Bienvenido!</h1>
            <p style="color: #94a3b8; margin-top: 0.25rem;">BioFacial — Sistema de Reconocimiento Facial</p>
        </div>
        
        <p>Hola <strong>{username}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente mediante <strong>{auth_method}</strong>. Ya puedes acceder al sistema.</p>
        
        <div style="background: #334155; border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
            <p style="margin: 0; font-size: 0.9rem;">📋 <strong>Datos de tu cuenta:</strong></p>
            <p style="margin: 0.5rem 0 0; color: #94a3b8; font-size: 0.85rem;">• Usuario: <strong style="color: #f8fafc;">{username}</strong></p>
            <p style="margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.85rem;">• Email: <strong style="color: #f8fafc;">{to_email}</strong></p>
            <p style="margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.85rem;">• Método: <strong style="color: #38bdf8;">{auth_method}</strong></p>
        </div>
        
        <div style="text-align: center; margin: 2rem 0;">
            <a href="{login_link}" style="background: linear-gradient(135deg, #10b981, #38bdf8); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1rem;">
                Ir a BioFacial
            </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 0.85rem;">Desde tu perfil puedes activar métodos de seguridad adicionales como <strong>Autenticación de Doble Factor (2FA)</strong> o <strong>Reconocimiento Facial</strong>.</p>
        
        <hr style="border: 1px solid #334155; margin: 1.5rem 0;">
        <p style="color: #64748b; font-size: 0.75rem; text-align: center;">BioFacial © 2026 — Solo personal autorizado</p>
    </div>
    """
    
    text_body = f"Bienvenido a BioFacial, {username}!\n\nTu cuenta ha sido creada via {auth_method}.\nEmail: {to_email}\n\nAccede en: {login_link}"
    
    return _send_email(to_email, subject, html_body, text_body)


def send_report_email(to_email: str, filename: str, content: bytes, file_format: str, message: str = "") -> bool:
    """Envía un reporte generado (PDF o Excel) por correo electrónico.
    
    Incluye un mensaje con la fecha y hora de entrega.
    """
    from datetime import datetime
    now = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    subject = f"📊 Reporte de Detecciones - BioFacial ({file_format.upper()})"
    
    # Cuerpo del correo con el mensaje y timestamp
    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #38bdf8; margin: 0;">📊 Reporte BioFacial</h1>
            <p style="color: #94a3b8; margin-top: 0.25rem;">Sistema de Monitoreo Facial</p>
        </div>
        
        <p>Hola,</p>
        <p>Se ha generado un nuevo reporte de detecciones solicitado desde el panel administrativo.</p>
        
        <div style="background: #334155; border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
            <p style="margin: 0; font-size: 0.95rem; color: #38bdf8;"><strong>Detalles de la entrega:</strong></p>
            <p style="margin: 0.5rem 0 0; color: #f8fafc; font-size: 0.9rem;">📅 Fecha y Hora: {now}</p>
            <p style="margin: 0.25rem 0 0; color: #f8fafc; font-size: 0.9rem;">📎 Formato: {file_format.upper()}</p>
            {f'<p style="margin: 1rem 0 0; font-style: italic; color: #94a3b8;">" {message} "</p>' if message else ""}
        </div>
        
        <p>Encontrarás el reporte adjunto a este correo.</p>
        
        <hr style="border: 1px solid #334155; margin: 1.5rem 0;">
        <p style="color: #64748b; font-size: 0.75rem; text-align: center;">BioFacial © 2026 — Reporte Generado Automáticamente</p>
    </div>
    """
    
    text_body = f"Reporte de Detecciones BioFacial\nFecha/Hora: {now}\nFormato: {file_format.upper()}\n\n{message}"
    
    # Definir el MIME type basado en el formato
    mimetype = "application/pdf" if file_format.lower() == "pdf" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    attachments = [(filename, content, mimetype)]
    
    return _send_email(to_email, subject, html_body, text_body, attachments=attachments)
