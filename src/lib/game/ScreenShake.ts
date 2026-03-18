import * as THREE from 'three';

export class ScreenShake {
  private camera: THREE.OrthographicCamera;
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  private offsetX = 0;
  private offsetY = 0;

  // Hit-stop: freeze frames on impactful hits
  private hitStopTimer = 0;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  shake(intensity: number = 0.15, duration: number = 0.15) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTimer = this.shakeDuration;
  }

  hitStop(duration: number = 0.04) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  /** Returns true if game should freeze this frame (hit-stop) */
  update(deltaTime: number): boolean {
    // Hit-stop
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= deltaTime;
      return true; // freeze frame
    }

    // Undo previous offset
    this.camera.position.x -= this.offsetX;
    this.camera.position.y -= this.offsetY;
    this.offsetX = 0;
    this.offsetY = 0;

    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
      const progress = this.shakeTimer / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;

      this.offsetX = (Math.random() - 0.5) * 2 * intensity;
      this.offsetY = (Math.random() - 0.5) * 2 * intensity;

      this.camera.position.x += this.offsetX;
      this.camera.position.y += this.offsetY;

      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
      }
    }

    return false;
  }
}
