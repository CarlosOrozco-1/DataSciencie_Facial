"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader2, User, UserRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detectGenderFromWebcam } from '@/ai/flows/gender-detection-from-webcam';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WebcamDetectionProps {
  onDetection: (gender: 'male' | 'female' | 'none_detected') => void;
  isDetecting: boolean;
}

export function WebcamDetection({ onDetection, isDetecting }: WebcamDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<'male' | 'female' | 'none_detected' | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setHasPermission(false);
      toast({
        variant: 'destructive',
        title: 'Error de Cámara',
        description: 'No se pudo acceder a la webcam. Por favor, revisa los permisos.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isDetecting || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUri = canvas.toDataURL('image/jpeg', 0.8);
      
      setIsProcessing(true);
      try {
        const result = await detectGenderFromWebcam({ imageDataUri });
        setLastResult(result.gender);
        onDetection(result.gender);
      } catch (error: any) {
        console.error("Detection error:", error);
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          toast({
            variant: 'destructive',
            title: 'Límite de API excedido',
            description: 'Se ha agotado la cuota gratuita de Gemini. Por favor, espera un momento antes de reintentar.',
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isDetecting, isProcessing, onDetection, toast]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDetecting) {
      // Aumentamos a 8 segundos para ser más amigables con la cuota gratuita
      interval = setInterval(() => {
        captureAndDetect();
      }, 8000); 
    }
    return () => clearInterval(interval);
  }, [isDetecting, captureAndDetect]);

  return (
    <div className="camera-feed-container bg-card border border-border min-h-[400px] flex flex-col items-center justify-center relative">
      {!hasPermission && hasPermission !== null && (
        <div className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-lg font-medium">Acceso a cámara denegado</p>
          <Button onClick={startCamera} variant="outline">Reintentar</Button>
        </div>
      )}

      {hasPermission === null && (
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      )}

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={cn(
          "w-full h-full object-cover rounded-lg transition-opacity duration-500",
          hasPermission ? "opacity-100" : "opacity-0"
        )}
      />
      <canvas ref={canvasRef} className="hidden" />

      {hasPermission && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
          <Badge variant="secondary" className="bg-background/60 backdrop-blur-md border-primary/20 flex items-center gap-2 py-1.5 px-3">
            <div className={cn("w-2 h-2 rounded-full", isDetecting ? "bg-green-500 animate-pulse" : "bg-red-500")} />
            {isDetecting ? "ANALIZANDO EN TIEMPO REAL" : "PAUSADO"}
          </Badge>
          
          {isProcessing && (
            <Badge variant="outline" className="bg-primary/20 text-primary border-none flex items-center gap-2 py-1.5 px-3 backdrop-blur-md">
              <Loader2 className="w-3 h-3 animate-spin" />
              IA PROCESANDO...
            </Badge>
          )}

          {lastResult && lastResult !== 'none_detected' && !isProcessing && (
            <Badge className="bg-accent text-accent-foreground flex items-center gap-2 py-1.5 px-3 backdrop-blur-md">
              {lastResult === 'male' ? <User className="w-4 h-4" /> : <UserRound className="w-4 h-4" />}
              {lastResult === 'male' ? "HOMBRE DETECTADO" : "MUJER DETECTADA"}
            </Badge>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-20">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full w-12 h-12 bg-background/80 hover:bg-background/100 backdrop-blur-sm border border-border"
          onClick={hasPermission ? stopCamera : startCamera}
        >
          {hasPermission ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}
