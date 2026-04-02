import { useEffect, useRef } from 'react'

// [NUEVO CÓDIGO]: Componente VideoPlayer que reemplaza el iframe/Streamlit
// Implementa el mecanismo "Polling asíncrono anti-crashes" que solucionó
// el error Invariant #231 en React provocado por el unmount del MJPEG.
export default function VideoPlayer({ cameraId }) {
  const imgRef = useRef(null)
  const isFetching = useRef(false)
  const animFrameId = useRef(null)
  
  useEffect(() => {
    let mounted = true
    const frameUrl = `http://localhost:8000/api/processing/frame/${cameraId}`
    
    // Función que carga la imagen y pide el siguiente frame usando requestAnimationFrame
    const fetchNextFrame = () => {
      if (!mounted || isFetching.current) return;
      isFetching.current = true;
      
      const tempImg = new Image();
      
      tempImg.onload = () => {
        if (mounted && imgRef.current) {
          imgRef.current.src = tempImg.src;
        }
        isFetching.current = false;
        
        // Loop sincronizado al monitor para máxima fluidez y bajo consumo de CPU.
        if (mounted) {
          animFrameId.current = requestAnimationFrame(fetchNextFrame)
        }
      }
      
      tempImg.onerror = () => {
        isFetching.current = false;
        // Si hay una desconexión o falla, intenta en 1 segundo otra vez.
        if (mounted) {
          setTimeout(fetchNextFrame, 1000)
        }
      }
      
      // Agrega timestamp para evitar cachés del navegador
      tempImg.src = `${frameUrl}?t=${new Date().getTime()}`
    }
    
    // Iniciar loop
    fetchNextFrame()
    
    // Al desmontar, detener limpiamente el loop para evitar sobrecarga y memory leaks
    return () => {
      mounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    }
  }, [cameraId])

  return (
    <div style={{
      width: '100%', 
      height: '100%',
      minHeight: '480px',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#000', 
      borderRadius: '12px', 
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
    }}>
      <img 
        ref={imgRef}
        style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }} 
        alt="Cargando Stream en Vivo..." 
      />
    </div>
  )
}
