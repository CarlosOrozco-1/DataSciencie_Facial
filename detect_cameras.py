#!/usr/bin/env python3
"""
Script para detectar cámaras disponibles en el sistema
Útil para encontrar el índice correcto de una cámara web USB
"""

import cv2
import sys

def detect_cameras():
    """Detecta todas las cámaras disponibles en el sistema"""
    print("🔍 Buscando cámaras disponibles en el sistema...\n")
    
    available_cameras = []
    
    # Probar índices del 0 al 10 (cubre la mayoría de casos)
    for i in range(10):
        try:
            cap = cv2.VideoCapture(i)
            
            if cap.isOpened():
                # Intenta leer un frame para confirmar que funciona
                ret, frame = cap.read()
                
                if ret and frame is not None:
                    # Obtener propiedades de la cámara
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = int(cap.get(cv2.CAP_PROP_FPS))
                    
                    camera_info = {
                        'index': i,
                        'width': width,
                        'height': height,
                        'fps': fps,
                        'status': '✅ FUNCIONAL'
                    }
                    available_cameras.append(camera_info)
                    
                    print(f"{'='*60}")
                    print(f"📷 CÁMARA DETECTADA")
                    print(f"{'='*60}")
                    print(f"  Índice:        {i}")
                    print(f"  Resolución:    {width}x{height}")
                    print(f"  FPS:           {fps}")
                    print(f"  Estado:        ✅ FUNCIONAL")
                    print()
                
                cap.release()
        except Exception as e:
            pass
    
    if not available_cameras:
        print("❌ NO SE ENCONTRARON CÁMARAS DISPONIBLES")
        print("\n⚠️  Soluciones:")
        print("  1. Verifica que la cámara web esté conectada por USB")
        print("  2. Revisa en 'Configuración > Dispositivos' si aparece")
        print("  3. En Linux, ejecuta: ls /dev/video*")
        print("  4. Instala los drivers de la cámara si es necesario")
        return False
    
    print(f"\n📊 RESUMEN: Se encontraron {len(available_cameras)} cámara(s)")
    
    print("\n" + "="*60)
    print("📋 TABLA DE CÁMARAS DISPONIBLES")
    print("="*60)
    for cam in available_cameras:
        print(f"Índice {cam['index']}: {cam['width']}x{cam['height']} @ {cam['fps']} FPS")
    
    print("\n" + "="*60)
    print("💡 CÓMO USAR EN LA APLICACIÓN:")
    print("="*60)
    for cam in available_cameras:
        print(f"\nPara usar la cámara {cam['index']}:")
        print(f"  - URL: \"{cam['index']}\"")
        print(f"  - En la solicitud POST /api/cameras/:")
        print(f"""  {{
    "name": "Mi Cámara Web {cam['index']}",
    "url": "{cam['index']}",
    "location": "Escritorio",
    "status": "active"
  }}""")
    
    return True

if __name__ == "__main__":
    try:
        success = detect_cameras()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
