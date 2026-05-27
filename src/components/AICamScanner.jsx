import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CameraOff, CheckCircle2, Cpu } from 'lucide-react';
import { backend } from '@/api/firebaseBackend';
import { crowdFromCount, crowdMeta } from '@/data';

const DEFAULT_SCAN_INTERVAL_MS = 12000;

export default function AICamScanner({
  busId,
  maxCapacity = 50,
  onCrowdUpdate,
  onCameraReady,
  onCameraError,
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
  const modelRef = useRef(null);
  const modelLoadedRef = useRef(false);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(Math.round(scanIntervalMs / 1000));
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');

  const [modelLoading, setModelLoading] = useState(false);

  const captureDataUrl = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const loadLocalModel = useCallback(async () => {
    if (modelLoadedRef.current) return;
    setModelLoading(true);
    try {
      await import('@tensorflow/tfjs');
      const coco = await import('@tensorflow-models/coco-ssd');
      // load the model (uses WebGL backend if available)
      modelRef.current = await coco.load({ base: 'lite_mobilenet_v2' });
      modelLoadedRef.current = true;
    } catch (e) {
      console.warn('Local model load failed:', e);
      setError('Local model load failed. Falling back to server analysis.');
    } finally {
      setModelLoading(false);
    }
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setError('');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) throw new Error('Camera is not ready yet.');
      // draw current frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let count = 0;
      // run local model if available
      if (modelRef.current) {
        const predictions = await modelRef.current.detect(canvas);
        const people = predictions.filter((p) => p.class === 'person' && p.score > 0.5);
        count = people.length;
      } else {
        // fallback to server-side analysis without storing the photo locally
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const result = await backend.ai.analyzePassengerImage({ imageDataUrl, maxCapacity });
        count = Math.max(0, Number(result?.count || 0));
      }

      const crowdLevel = crowdFromCount(count, maxCapacity);
      const meta = crowdMeta[crowdLevel] || crowdMeta.available;
      setLastResult({ count, relevant: true, crowdLevel, meta });
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
  }, [busId, maxCapacity, onCrowdUpdate, scanIntervalMs, scanning, loadLocalModel]);

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
      onCameraReady?.();
      // start loading local model in background for on-device counting
      loadLocalModel().catch(() => {});
    } catch {
      setError('Camera access denied. Please allow camera permission.');
      onCameraError?.();
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
      {modelLoading && <div className="ai-photo-result"><span>Loading model…</span></div>}
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
