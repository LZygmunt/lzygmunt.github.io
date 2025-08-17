import {
  type BooleanController,
  type Controller,
  type FunctionController,
  type KeyToValueOfType,
  GUI as lilGUI,
  type NumberController,
  type OptionController,
  type StringController,
} from "three/addons/libs/lil-gui.module.min";

export type LilGUIOptions = ConstructorParameters<typeof lilGUI>[0];

export class GUI<T extends object> {
  public readonly nativeGUI: lilGUI;
  public readonly controls: T;

  constructor(guiOptionsOrInstance: LilGUIOptions | lilGUI, controls: T) {
    this.nativeGUI =
      guiOptionsOrInstance instanceof lilGUI
        ? guiOptionsOrInstance
        : new lilGUI(guiOptionsOrInstance);
    this.controls = controls;
  }

  public static create<T extends object>(boundObject: T, params?: LilGUIOptions): GUI<T> {
    const rootGui = new lilGUI(params);
    return new GUI(rootGui, boundObject);
  }

  add(
    property: KeyToValueOfType<T, number>,
    min?: number,
    max?: number,
    step?: number,
  ): NumberController;
  add(property: KeyToValueOfType<T, boolean>): BooleanController;
  add(property: KeyToValueOfType<T, string>): StringController;
  add(property: KeyToValueOfType<T, Function>): FunctionController;
  add<K extends keyof T>(
    property: K,
    options: ReadonlyArray<T[K]> | Record<string, T[K]>,
  ): OptionController;
  add(property: keyof T, ...args: any[]): Controller {
    return (this.nativeGUI.add as any)(this.controls, property, ...args);
  }

  public addFolder(title: string): GUI<T> {
    const folderGUI = this.nativeGUI.addFolder(title);
    return new GUI(folderGUI, this.controls);
  }

  public addColor(
    property: keyof T,
    colorSpace: "srgb" | "srgb-linear" | "display-p3" = "srgb",
  ): Controller {
    return (this.nativeGUI.addColor as any)(this.controls, property, colorSpace);
  }

  public onChange(
    callback: (event: { object: T; property: keyof T; value: any; controller: Controller }) => void,
  ): this {
    this.nativeGUI.onChange(callback as any);
    return this;
  }

  public destroy(): void {
    this.nativeGUI.destroy();
  }

  public open(open = true): this {
    this.nativeGUI.open(open);
    return this;
  }

  public reset(recursive = true): this {
    this.nativeGUI.reset(recursive);
    return this;
  }
}
