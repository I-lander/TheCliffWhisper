export enum HumanState {
  Walking = 'Walking',
  FlipTurn = 'FlipTurn',
  TurningBack = 'TurningBack',
  Diving = 'Diving',
  Falling = 'Falling',
  Gone = 'Gone',
}

export class Human extends Phaser.GameObjects.Sprite {
  state: HumanState = HumanState.Walking;
  walkSpeed: number;
  private cliffEdgeX: number;
  private groundY: number;
  private turnBackX: number;
  private shouldTurnBack: boolean;

  // Dive parameters (randomized)
  private diveVelocityX: number = 0;
  private diveVelocityY: number = 0;
  private gravity: number = 500;
  private diveRotation: number = 0;
  private rotationSpeed: number = 0;
  private walkTime: number = 0;
  private walkBobAmount: number = 0;
  private walkAnimSpeed: number = 0;
  private flipProgress: number = 0;
  private baseScaleX: number = 0;

  private onJumped: (x: number, y: number) => void;
  private onTurnedBack: () => void;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    groundY: number,
    cliffEdgeX: number,
    walkSpeed: number,
    shouldTurnBack: boolean,
    onJumped: (x: number, y: number) => void,
    onTurnedBack: () => void,
  ) {
    super(scene, startX, groundY, 'human');

    const scale = (scene.cameras.main.height / 18) / 16;
    this.setScale(scale);
    this.setOrigin(0.5, 1);

    // Randomize walk speed: ±25% of base, clamped
    const speedVariation = 0.75 + Math.random() * 0.5;
    this.walkSpeed = Math.max(60, Math.min(300, walkSpeed * speedVariation));

    this.cliffEdgeX = cliffEdgeX;
    this.groundY = groundY;
    this.shouldTurnBack = shouldTurnBack;
    this.onJumped = onJumped;
    this.onTurnedBack = onTurnedBack;

    // Turn-back decision point: random between 30%-80% of the walk
    this.turnBackX = startX + (cliffEdgeX - startX) * (0.3 + Math.random() * 0.5);

    // Walk animation: bob + sway, speed tied to walk speed
    this.walkBobAmount = 0.8 + Math.random() * 0.7;
    this.walkTime = Math.random() * Math.PI * 2; // desync between humans
    this.walkAnimSpeed = 14 + (this.walkSpeed / 30); // faster walk = faster anim
    this.baseScaleX = this.scaleX;

    scene.add.existing(this);
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    switch (this.state) {
      case HumanState.Walking:
        this.x += this.walkSpeed * dt;
        this.walkTime += dt * this.walkAnimSpeed;
        this.y = this.groundY + Math.sin(this.walkTime) * this.walkBobAmount;
        this.setRotation(Math.sin(this.walkTime * 0.5) * 0.08);

        if (this.shouldTurnBack && this.x >= this.turnBackX) {
          this.state = HumanState.FlipTurn;
          this.flipProgress = 0;
          this.setRotation(0);
          this.onTurnedBack();
          break;
        }

        const tileSize = this.scene.cameras.main.height / 18;
        if (this.x >= this.cliffEdgeX - tileSize / 2) {
          this.startDive();
          this.onJumped(this.x, this.y);
        }
        break;

      case HumanState.FlipTurn:
        // Paper Mario style: squeeze scaleX to 0, then flip and expand back
        this.flipProgress += dt * 4; // full flip in ~0.5s
        if (this.flipProgress < 1) {
          // Phase 1: squeeze to 0
          this.setScale(this.baseScaleX * (1 - this.flipProgress), this.scaleY);
        } else if (this.flipProgress < 2) {
          // Phase 2: expand back (flipped)
          this.setScale(this.baseScaleX * (this.flipProgress - 1), this.scaleY);
          this.setFlipX(true);
        } else {
          // Done — start walking back
          this.setScale(this.baseScaleX, this.scaleY);
          this.setFlipX(true);
          this.state = HumanState.TurningBack;
        }
        break;

      case HumanState.TurningBack:
        this.x -= this.walkSpeed * 0.6 * dt;
        this.walkTime += dt * this.walkAnimSpeed;
        this.y = this.groundY + Math.sin(this.walkTime) * this.walkBobAmount;
        this.setRotation(Math.sin(this.walkTime * 0.5) * 0.08);
        this.setAlpha(this.alpha - dt * 0.4);
        if (this.alpha <= 0) {
          this.state = HumanState.Gone;
        }
        break;

      case HumanState.Diving:
        // Arc phase — moving forward and up slightly before falling
        this.diveVelocityY += this.gravity * dt;
        this.x += this.diveVelocityX * dt;
        this.y += this.diveVelocityY * dt;
        this.diveRotation += this.rotationSpeed * dt;
        this.setRotation(this.diveRotation);

        // Transition to falling once moving downward
        if (this.diveVelocityY > 0) {
          this.state = HumanState.Falling;
        }
        break;

      case HumanState.Falling:
        this.diveVelocityY += this.gravity * dt;
        this.x += this.diveVelocityX * dt;
        this.y += this.diveVelocityY * dt;
        this.diveRotation += this.rotationSpeed * dt;
        this.setRotation(this.diveRotation);

        if (this.y > this.scene.cameras.main.height + 50) {
          this.state = HumanState.Gone;
        }
        break;
    }
  }

  private startDive() {
    this.state = HumanState.Diving;

    // Random dive parameters for variation
    const baseJumpX = 60 + Math.random() * 140;   // horizontal distance: 60-200px
    const baseJumpY = -150 - Math.random() * 100;  // upward impulse: -150 to -250

    this.diveVelocityX = baseJumpX;
    this.diveVelocityY = baseJumpY;
    this.rotationSpeed = 1.5 + Math.random() * 3; // rotation: 1.5 to 4.5 rad/s
  }

  forceJump() {
    if (this.state !== HumanState.Walking) return;
    this.startDive();
    this.onJumped(this.x, this.y);
  }

  forceTurnBack() {
    if (this.state !== HumanState.Walking) return;
    this.state = HumanState.FlipTurn;
    this.flipProgress = 0;
    this.setRotation(0);
  }

  isWalking(): boolean {
    return this.state === HumanState.Walking;
  }

  getProgress(): number {
    return this.x / this.cliffEdgeX;
  }

  isGone(): boolean {
    return this.state === HumanState.Gone;
  }
}
