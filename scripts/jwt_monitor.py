#!/usr/bin/env python3
"""
🔐 JWT Handshake Monitor - GenderSense
=======================================
Script de línea de comandos para visualizar en tiempo real
el intercambio de tokens JWT entre el frontend y el backend.

Uso:
    python3 scripts/jwt_monitor.py

Requisitos:
    - Docker corriendo con el servicio 'app' activo
    - Acceso a los logs del contenedor facial_api

El script intercepta los logs del contenedor Docker en tiempo real
y muestra de forma visual cada handshake JWT que ocurre.
"""

import subprocess
import sys
import re
from datetime import datetime

# Colores ANSI para la terminal
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    
    BG_DARK = "\033[40m"
    BG_BLUE = "\033[44m"
    BG_GREEN = "\033[42m"

def print_banner():
    """Imprime el banner de inicio del monitor"""
    print(f"""
{Colors.CYAN}{Colors.BOLD}╔══════════════════════════════════════════════════════════════╗
║               🔐 JWT HANDSHAKE MONITOR                       ║
║               GenderSense Security Layer                     ║
╚══════════════════════════════════════════════════════════════╝{Colors.RESET}
{Colors.DIM}Escuchando el intercambio de tokens JWT en tiempo real...
Presiona Ctrl+C para detener.{Colors.RESET}
""")

def format_timestamp():
    """Retorna timestamp formateado"""
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]

def parse_and_display(line):
    """Analiza una línea del log y la muestra de forma visual"""
    
    # Detectar handshake JWT capturado por nuestro middleware
    if "JWT Handshake Capturado" in line:
        timestamp = format_timestamp()
        print(f"\n{Colors.GREEN}{Colors.BOLD}🔐 [{timestamp}] TOKEN JWT INTERCEPTADO{Colors.RESET}")
        return True
    
    if "├─ Origen:" in line:
        origin = line.split("Origen:")[-1].strip()
        print(f"  {Colors.CYAN}├─ Origen del Cliente:{Colors.RESET} {Colors.WHITE}{origin}{Colors.RESET}")
        return True
        
    if "├─ Destino Endpoint:" in line:
        endpoint = line.split("Destino Endpoint:")[-1].strip()
        
        # Colorear según tipo de endpoint
        if "/auth/" in endpoint:
            color = Colors.YELLOW
            icon = "🔑"
        elif "/cameras/" in endpoint:
            color = Colors.BLUE
            icon = "📷"
        elif "/detections/" in endpoint:
            color = Colors.MAGENTA
            icon = "🔍"
        elif "/processing/" in endpoint:
            color = Colors.CYAN
            icon = "⚙️"
        elif "/users/" in endpoint:
            color = Colors.GREEN
            icon = "👤"
        else:
            color = Colors.WHITE
            icon = "📡"
            
        print(f"  {Colors.CYAN}├─ Endpoint Destino:{Colors.RESET}  {color}{icon} {endpoint}{Colors.RESET}")
        return True
    
    if "└─ Carga Token JWT:" in line:
        token_info = line.split("Carga Token JWT:")[-1].strip()
        print(f"  {Colors.CYAN}└─ Firma del Token:{Colors.RESET}   {Colors.YELLOW}{token_info}{Colors.RESET}")
        return True
    
    if "──────────" in line:
        print(f"  {Colors.DIM}{'─' * 58}{Colors.RESET}")
        return True
    
    # Detectar requests HTTP normales (INFO lines)
    http_match = re.search(r'"(GET|POST|PUT|DELETE) (.+?) HTTP/\d\.\d" (\d+)', line)
    if http_match:
        method = http_match.group(1)
        path = http_match.group(2)
        status = http_match.group(3)
        timestamp = format_timestamp()
        
        # Color según status code
        if status.startswith("2"):
            status_color = Colors.GREEN
            status_icon = "✅"
        elif status.startswith("4"):
            status_color = Colors.RED
            status_icon = "❌"
        else:
            status_color = Colors.YELLOW
            status_icon = "⚠️"
        
        # Color según método HTTP
        method_colors = {
            "GET": Colors.CYAN,
            "POST": Colors.GREEN,
            "PUT": Colors.YELLOW,
            "DELETE": Colors.RED
        }
        method_color = method_colors.get(method, Colors.WHITE)
        
        print(f"  {Colors.DIM}{timestamp}{Colors.RESET} {method_color}{method:6s}{Colors.RESET} {path:45s} {status_color}{status_icon} {status}{Colors.RESET}")
        return True
    
    # Detectar seed de usuario
    if "Sembrando" in line or "generado con" in line:
        print(f"  {Colors.GREEN}{Colors.BOLD}{line.strip()}{Colors.RESET}")
        return True
    
    # Detectar errores
    if "ERROR" in line or "Error" in line:
        print(f"  {Colors.RED}⚠️  {line.strip()}{Colors.RESET}")
        return True
    
    return False

def main():
    """Función principal del monitor"""
    print_banner()
    
    # Contador de estadísticas
    stats = {
        "total_requests": 0,
        "jwt_handshakes": 0,
        "errors": 0
    }
    
    try:
        # Abrir los logs del contenedor Docker en modo follow
        process = subprocess.Popen(
            ["docker", "compose", "logs", "-f", "--tail", "0", "app"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd="/home/carlosorozco/Documents/Proyecto-Reconocimiento-Facial"
        )
        
        print(f"{Colors.GREEN}✅ Conectado al contenedor facial_api{Colors.RESET}")
        print(f"{Colors.DIM}Esperando actividad en el servidor...{Colors.RESET}\n")
        
        for line in process.stdout:
            # Limpiar prefijo del contenedor Docker
            clean_line = line.strip()
            if "facial_api  |" in clean_line:
                clean_line = clean_line.split("facial_api  |", 1)[-1].strip()
            
            if parse_and_display(clean_line):
                # Actualizar estadísticas
                if "JWT Handshake" in clean_line:
                    stats["jwt_handshakes"] += 1
                elif "HTTP/" in clean_line:
                    stats["total_requests"] += 1
                elif "Error" in clean_line:
                    stats["errors"] += 1
                    
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}{Colors.BOLD}━━━ Sesión de Monitoreo Finalizada ━━━{Colors.RESET}")
        print(f"  📊 Peticiones HTTP capturadas: {Colors.CYAN}{stats['total_requests']}{Colors.RESET}")
        print(f"  🔐 Handshakes JWT detectados: {Colors.GREEN}{stats['jwt_handshakes']}{Colors.RESET}")
        print(f"  ⚠️  Errores registrados:       {Colors.RED}{stats['errors']}{Colors.RESET}")
        print(f"\n{Colors.DIM}Monitor detenido.{Colors.RESET}\n")
    except FileNotFoundError:
        print(f"{Colors.RED}❌ Error: Docker no está instalado o no está en el PATH.{Colors.RESET}")
        sys.exit(1)

if __name__ == "__main__":
    main()
