import { ASPECT_RATIOS } from '../types/editor';
import { renderFrame } from './previewRenderer';











export class ExportPipeline {constructor() { ExportPipeline.prototype.__init.call(this); }
   __init() {this.isCancelled = false}

   cancel() {
    this.isCancelled = true;
  }

   async exportProject(
    project,
    settings,
    onProgress
  ) {
    this.isCancelled = false;
    console.log('[ClipForge:Export] Pipeline starting exportProject:', {
      projectName: project.name,
      duration: project.duration,
      format: settings.format,
      resolution: settings.resolution,
      fps: settings.fps,
      quality: settings.quality,
    });

    // Handle single frame PNG capture
    if (settings.format === 'png-frame') {
      return this.exportSingleFramePNG(project, settings, onProgress);
    }

    // Resolution dimensions
    const ratioConfig = ASPECT_RATIOS[project.aspectRatio];
    let targetWidth = ratioConfig.width;
    let targetHeight = ratioConfig.height;

    if (settings.resolution === '480p') {
      const scale = 480 / targetHeight;
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = 480;
    } else if (settings.resolution === '720p') {
      const scale = 720 / targetHeight;
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = 720;
    } else if (settings.resolution === '1080p') {
      // standard 1080p
    } else if (settings.resolution === '2K') {
      targetWidth = Math.round(targetWidth * 1.33);
      targetHeight = Math.round(targetHeight * 1.33);
    } else if (settings.resolution === '4K') {
      targetWidth = Math.round(targetWidth * 2);
      targetHeight = Math.round(targetHeight * 2);
    }

    // Setup off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    const fps = settings.fps;
    const totalDuration = Math.max(project.duration, 1);
    const totalFrames = Math.floor(totalDuration * fps);

    // Setup MediaRecorder
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const stream = canvas.captureStream(fps);
    const recordedChunks = [];

    let bitrate = 5000000; // 5 Mbps default
    if (settings.quality === 'ultra') bitrate = 20000000;
    else if (settings.quality === 'high') bitrate = 10000000;
    else if (settings.quality === 'low') bitrate = 2500000;

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    // Frame-by-frame rendering loop
    const frameInterval = 1 / fps;
    const frameDelayMs = 1000 / fps;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        recorder.stop();
        onProgress({
          percentage: 0,
          currentFrame: frame,
          totalFrames,
          statusText: 'Export cancelled',
          isComplete: false,
        });
        return null;
      }

      const currentTime = frame * frameInterval;
      renderFrame(ctx, project, currentTime, {
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        isExporting: true,
        showSafeGuides: false,
      });

      const percentage = Math.round(((frame + 1) / totalFrames) * 100);
      if (frame % Math.max(1, Math.floor(totalFrames / 5)) === 0 || frame === totalFrames - 1) {
        console.log('[ClipForge:Export] Frame encoding progress:', `${percentage}% (${frame + 1}/${totalFrames})`);
      }
      onProgress({
        percentage,
        currentFrame: frame + 1,
        totalFrames,
        statusText: `Encoding frame ${frame + 1}/${totalFrames} (${percentage}%)...`,
        isComplete: false,
      });

      // Allow event loop to process MediaRecorder chunks
      await new Promise((r) => setTimeout(r, Math.min(frameDelayMs * 0.4, 16)));
    }

    return new Promise((resolve, reject) => {
      recorder.onerror = (err) => {
        console.error('[ClipForge:Export] MediaRecorder error event:', err);
        reject(err);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        console.log('[ClipForge:Export] Pipeline completed successfully! Final blob size:', finalBlob.size, 'bytes, mime:', mimeType);
        const downloadUrl = URL.createObjectURL(finalBlob);

        onProgress({
          percentage: 100,
          currentFrame: totalFrames,
          totalFrames,
          statusText: 'Export complete!',
          isComplete: true,
          downloadUrl,
        });

        // Trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        const ext = settings.format === 'mp4' ? 'mp4' : 'webm';
        a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${settings.resolution}.${ext}`;
        a.click();

        resolve(downloadUrl);
      };

      recorder.stop();
    });
  }

   async exportSingleFramePNG(
    project,
    settings,
    onProgress
  ) {
    const ratioConfig = ASPECT_RATIOS[project.aspectRatio];
    const canvas = document.createElement('canvas');
    canvas.width = ratioConfig.width;
    canvas.height = ratioConfig.height;
    const ctx = canvas.getContext('2d');

    renderFrame(ctx, project, 0, {
      canvasWidth: ratioConfig.width,
      canvasHeight: ratioConfig.height,
      isExporting: true,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_frame.png`;
    a.click();

    onProgress({
      percentage: 100,
      currentFrame: 1,
      totalFrames: 1,
      statusText: 'Snapshot downloaded!',
      isComplete: true,
      downloadUrl: dataUrl,
    });

    return dataUrl;
  }
}

export const exportPipeline = new ExportPipeline();

export const ExportProgress = Object.freeze({});
