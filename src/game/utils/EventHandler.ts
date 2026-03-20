import { MainScene } from '../scenes/MainScene';
import { UIScene } from '../scenes/UIScene';
import { toggleDebugGrid } from './utils';

export class EventHandler {
  mainScene: MainScene;
  uiScene: UIScene;
  mouseX: number;
  mouseY: number;
  isDraggingWorld: boolean = false;
  keyPressed: string[] = [];

  isPinching: boolean = false;
  pinchPrevDist: number = 0;
  pinchCenterX: number = 0;
  pinchCenterY: number = 0;

  minZoom: number = 0.5;
  maxZoom: number = 2.5;

  constructor(scene: MainScene) {
    this.mainScene = scene;
    this.uiScene = this.mainScene.scene.get('UIScene') as UIScene;
    this.mouseX = 0;
    this.mouseY = 0;

    this.init();
  }

  init() {
    this.mainScene.input.addPointer(2);

    this.mainScene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      const hitObjects = this.mainScene.input.hitTestPointer(pointer);
      if (hitObjects.length === 0) {
        this.isDraggingWorld = true;
      }
    });

    this.mainScene.input.on(
      Phaser.Input.Events.POINTER_UP,
      () => {
        this.isDraggingWorld = false;
      },
    );

    this.mainScene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingWorld && !this.isPinching) {
        const dragX =
          (pointer.position.x - pointer.prevPosition.x) * (1 / this.mainScene.cameras.main.zoom);
        const dragY =
          (pointer.position.y - pointer.prevPosition.y) * (1 / this.mainScene.cameras.main.zoom);
        this.mainScene.cameras.main.scrollX -= dragX;
        this.mainScene.cameras.main.scrollY -= dragY;
      }
    });

    this.mainScene.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (pointer: Phaser.Input.Pointer, _objects: any[], _dx: number, deltaY: number) => {
        const cam = this.mainScene.cameras.main;

        const oldZoom = cam.zoom;
        const newZoom = Phaser.Math.Clamp(oldZoom - deltaY * 0.002, this.minZoom, this.maxZoom);
        if (newZoom === oldZoom) return;

        const sx = pointer.x - cam.width * 0.5;
        const sy = pointer.y - cam.height * 0.5;

        cam.zoom = newZoom;

        cam.scrollX += sx / oldZoom - sx / newZoom;
        cam.scrollY += sy / oldZoom - sy / newZoom;
      },
    );

    this.mainScene.input.keyboard?.on('keydown', (key: KeyboardEvent) => {
      if (key.code === 'KeyW' || key.code === 'ArrowUp') this.keyPressed.push('up');
      if (key.code === 'KeyS' || key.code === 'ArrowDown') this.keyPressed.push('down');
      if (key.code === 'KeyA' || key.code === 'ArrowLeft') this.keyPressed.push('left');
      if (key.code === 'KeyD' || key.code === 'ArrowRight') this.keyPressed.push('right');

      if (import.meta.env.VITE_IS_DEV_SPLASH === 'true') {
        if (key.code === 'KeyG') {
          toggleDebugGrid(this.uiScene);
        }
      }
    });

    this.mainScene.input.keyboard?.on('keyup', (key: KeyboardEvent) => {
      if (key.code === 'KeyW' || key.code === 'ArrowUp')
        this.keyPressed = this.keyPressed.filter((k) => k !== 'up');
      if (key.code === 'KeyS' || key.code === 'ArrowDown')
        this.keyPressed = this.keyPressed.filter((k) => k !== 'down');
      if (key.code === 'KeyA' || key.code === 'ArrowLeft')
        this.keyPressed = this.keyPressed.filter((k) => k !== 'left');
      if (key.code === 'KeyD' || key.code === 'ArrowRight')
        this.keyPressed = this.keyPressed.filter((k) => k !== 'right');
    });
  }

  getTwoActivePointers(): Phaser.Input.Pointer[] | null {
    const pointers = [
      this.mainScene.input.pointer1,
      this.mainScene.input.pointer2,
      this.mainScene.input.pointer3,
    ];

    const down = pointers.filter((p) => p && p.isDown);
    return down.length >= 2 ? [down[0], down[1]] : null;
  }

  handlePinch(twoPointers: Phaser.Input.Pointer[]) {
    const cam = this.mainScene.cameras.main;
    const [p1, p2] = twoPointers;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    const centerX = (p1.x + p2.x) * 0.5;
    const centerY = (p1.y + p2.y) * 0.5;

    if (!this.isPinching) {
      this.isPinching = true;
      this.pinchPrevDist = dist;
      this.pinchCenterX = centerX;
      this.pinchCenterY = centerY;
      this.isDraggingWorld = false;
      return;
    }

    const scale = dist / this.pinchPrevDist;
    const oldZoom = cam.zoom;

    let newZoom = oldZoom * scale;
    newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);
    if (newZoom === oldZoom) return;

    const sx = centerX - cam.width * 0.5;
    const sy = centerY - cam.height * 0.5;

    cam.zoom = newZoom;

    cam.scrollX += sx / oldZoom - sx / newZoom;
    cam.scrollY += sy / oldZoom - sy / newZoom;

    this.pinchPrevDist = dist;
    this.pinchCenterX = centerX;
    this.pinchCenterY = centerY;
  }

  countActivePointers(): number {
    const pointers = [
      this.mainScene.input.pointer1,
      this.mainScene.input.pointer2,
      this.mainScene.input.pointer3,
    ];
    return pointers.filter((p) => p && p.isDown).length;
  }

  update() {
    const twoPointers = this.getTwoActivePointers();
    if (twoPointers) {
      this.handlePinch(twoPointers);
    } else if (this.isPinching && this.countActivePointers() === 0) {
      this.isPinching = false;
    }

    if (this.keyPressed.includes('up')) this.mainScene.cameras.main.scrollY -= 10;
    if (this.keyPressed.includes('down')) this.mainScene.cameras.main.scrollY += 10;
    if (this.keyPressed.includes('left')) this.mainScene.cameras.main.scrollX -= 10;
    if (this.keyPressed.includes('right')) this.mainScene.cameras.main.scrollX += 10;
  }
}
