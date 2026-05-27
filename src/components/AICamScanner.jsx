import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CameraOff, CheckCircle2, Cpu } from 'lucide-react';
import { backend } from '@/api/firebaseBackend';
import { crowdFromCount, crowdMeta } from '@/data';

const DEFAULT_SCAN_INTERVAL_MS = 12000;

export default function AICamScanner({
  busId,
  maxCapacity = 50,
  onCrowdUpdate,
  autoEnabled = true,
  autoStart = false,
  compact = false,
  scanIntervalMs = DEFAULT_SCAN_INTERVAL_MS,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const countTimerRef = useRef(null);
  const autoStartAttemptedRef = useRef(false);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(Math.round(scanIntervalMs / 1000));
  const [lastResult, setLastResult] = useState(null);
  const [lastPhoto, setLastPhoto] = useState('');
  const [error, setError] = useState('');

  const captureDataUrl = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const captureAndAnalyze = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setError('');
    try {
      const imageDataUrl = await captureDataUrl();
      if (!imageDataUrl) throw new Error('Camera is not ready yet.');
      const result = await backend.ai.analyzePassengerImage({ imageDataUrl, maxCapacity });
      const count = Math.max(0, Number(result?.count || 0));
      const crowdLevel = result?.crowd_level || crowdFromCount(count, maxCapacity);
      const meta = crowdMeta[crowdLevel] || crowdMeta.available;
      setLastPhoto(imageDataUrl);
      setLastResult({ count, relevant: result?.relevant !== false, crowdLevel, meta });
      setCountdown(Math.round(scanIntervalMs / 1000));
      if (busId) {
        await backend.entities.Bus.update(busId, { passenger_count: count, crowd_level: crowdLevel });
      }
      onCrowdUpdate?.(crowdLevel, count);
    } catch (err) {
      setError(err.message || 'Scan failed. Will retry.');
    } finally {
      setScanning(false);
    }
  }, [busId, maxCapacity, onCrowdUpdate, scanIntervalMs, scanning]);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
    } catch {
      setError('Camera access denied. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearInterval(scanTimerRef.current);
    clearInterval(countTimerRef.current);
    setActive(false);
    setScanning(false);
    setCountdown(Math.round(scanIntervalMs / 1000));
  }, [scanIntervalMs]);

  useEffect(() => {
    if (!active || !autoEnabled) return undefined;
    const warmup = setTimeout(captureAndAnalyze, 1500);
    scanTimerRef.current = setInterval(captureAndAnalyze, scanIntervalMs);
    countTimerRef.current = setInterval(() => {
      setCountdown((n) => (n <= 1 ? Math.round(scanIntervalMs / 1000) : n - 1));
    }, 1000);
    return () => {
      clearTimeout(warmup);
      clearInterval(scanTimerRef.current);
      clearInterval(countTimerRef.current);
    };
  }, [active, autoEnabled, captureAndAnalyze, scanIntervalMs]);

  useEffect(() => {
    if (autoStart && !active && !autoStartAttemptedRef.current) {
      autoStartAttemptedRef.current = true;
      startCamera();
    }
    if (!autoStart && active) stopCamera();
  }, [active, autoStart, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <section className={compact ? 'panel camera-panel driver-auto-camera' : 'panel camera-panel'}>
      <div className="panel-head">
        <div className="inline-title"><Cpu size={17} /> AI Crowd Scanner</div>
        {!autoStart && <button className={active ? 'danger-btn' : 'primary-btn'} onClick={active ? stopCamera : startCamera}>
          {active ? <CameraOff size={16} /> : <Camera size={16} />}
          {active ? 'Stop' : 'Start Camera'}
        </button>}
      </div>
      <div className="camera-box">
        <video ref={videoRef} muted playsInline autoPlay />
        <canvas ref={canvasRef} hidden />
        {!active && <div className="camera-empty"><Camera size={38} /><span>Camera off</span></div>}
        {scanning && <div className="scan-flash" />}
        {active && <span className="count-chip">{scanning ? 'Scanning...' : `Next scan ${countdown}s`}</span>}
      </div>
      {lastPhoto && (
        <div className="ai-photo-result">
          <img src={lastPhoto} alt="Latest passenger count capture" />
          <span>Latest photo</span>
        </div>
      )}
      <div className="result-row">
        {error && <span className="error-text"><AlertCircle size={15} /> {error}</span>}
        {!error && lastResult && (
          <>
            <span><CheckCircle2 size={16} /> <b>{lastResult.count}</b> people found</span>
            <span className="crowd-pill" style={{ color: lastResult.meta.color, borderColor: lastResult.meta.color }}>
              {lastResult.meta.label}
            </span>
          </>
        )}
        {!error && !lastResult && <span>Taking a photo every {Math.round(scanIntervalMs / 1000)} seconds.</span>}
      </div>
    </section>
  );
}
