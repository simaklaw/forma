/**
 * Type declarations for Excalidraw integration
 * 
 * Excalidraw is MIT-licensed and free for commercial use.
 * Source: https://github.com/excalidraw/excalidraw
 * 
 * This file provides TypeScript definitions for the Excalidraw library
 * to ensure type safety when using it with Forma's workout domain.
 */

// Re-export types from the actual package when available
// These are fallback declarations for when types aren't properly resolved

declare module "@excalidraw/excalidraw" {
  import type { ComponentRef, ForwardRefExoticComponent, RefAttributes } from "react";

  /**
   * Base element type for all Excalidraw shapes
   */
  export interface ExcalidrawBaseElement {
    type: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    strokeColor: string;
    backgroundColor: string;
    fillStyle: "hachure" | "cross-hatch" | "solid" | "none";
    strokeWidth: number;
    strokeStyle: "solid" | "dashed" | "dotted";
    roughness: number;
    opacity: number;
    groupIds: string[];
    strokeSharpness: "sharp" | "round" | "none";
    seed: number;
    version: number;
    versionNonce: number;
    isDeleted: boolean;
    boundElements: ExcalidrawElement[];
    updated: number;
    link: null | string;
    locked: boolean;
    customData?: Record<string, unknown>;
  }

  /**
   * Rectangle element
   */
  export interface ExcalidrawRectangle extends ExcalidrawBaseElement {
    type: "rectangle";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Ellipse element
   */
  export interface ExcalidrawEllipse extends ExcalidrawBaseElement {
    type: "ellipse";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Text element
   */
  export interface ExcalidrawTextElement extends ExcalidrawBaseElement {
    type: "text";
    text: string;
    fontSize: number;
    fontFamily: number;
    textAlign: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
    baseline: number;
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Freehand drawing element
   */
  export interface ExcalidrawFreehandElement extends ExcalidrawBaseElement {
    type: "freedraw";
    points: Array<{ x: number; y: number }>;
    pressures: number[];
    lastCommittedPoint: null | { x: number; y: number };
    simulatePressure: boolean;
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Line element
   */
  export interface ExcalidrawLineElement extends ExcalidrawBaseElement {
    type: "line";
    points: Array<{ x: number; y: number }>;
    lastCommittedPoint: null | { x: number; y: number };
    startBinding: null | {
      elementId: string;
      gap: number;
      focus: number;
    };
    endBinding: null | {
      elementId: string;
      gap: number;
      focus: number;
    };
    startArrowhead: null | "arrow" | "bar" | "dot" | "circle";
    endArrowhead: null | "arrow" | "bar" | "dot" | "circle";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Arrow element (alias for line with arrowheads)
   */
  export interface ExcalidrawArrowElement extends ExcalidrawLineElement {
    type: "arrow";
  }

  /**
   * Diamond element
   */
  export interface ExcalidrawDiamondElement extends ExcalidrawBaseElement {
    type: "diamond";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Image element
   */
  export interface ExcalidrawImageElement extends ExcalidrawBaseElement {
    type: "image";
    fileId: null | string;
    status: "pending" | "uploading" | "error" | "saved";
    scale: [number, number];
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }

  /**
   * Custom exercise shape for Forma workout visualization
   */
  export interface ExcalidrawExerciseElement extends ExcalidrawBaseElement {
    type: "exercise";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
    customData: {
      exerciseId: string;
      exerciseRevisionId?: string;
      name: string;
      targetSets: number;
      targetReps: number;
      targetWeightKg: number;
      restSeconds: number;
      completedSets: number;
      currentSet: number;
      skipped: boolean;
    };
  }

  /**
   * Custom set marker shape for Forma
   */
  export interface ExcalidrawSetElement extends ExcalidrawBaseElement {
    type: "workout-set";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
    customData: {
      exerciseId: string;
      setNumber: number;
      weightKg: number;
      reps: number;
      rir?: number;
      completed: boolean;
      completedAtMs?: number;
    };
  }

  /**
   * Custom progress marker for current exercise
   */
  export interface ExcalidrawProgressElement extends ExcalidrawBaseElement {
    type: "progress-marker";
    calc: {
      x: number;
      y: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
    customData: {
      currentStepIndex: number;
      exerciseId: string;
      sessionId: string;
    };
  }

  /**
   * Union type for all Excalidraw elements
   */
  export type ExcalidrawElement =
    | ExcalidrawRectangle
    | ExcalidrawEllipse
    | ExcalidrawTextElement
    | ExcalidrawFreehandElement
    | ExcalidrawLineElement
    | ExcalidrawArrowElement
    | ExcalidrawDiamondElement
    | ExcalidrawImageElement
    | ExcalidrawExerciseElement
    | ExcalidrawSetElement
    | ExcalidrawProgressElement
    | { type: string; [key: string]: unknown };

  /**
   * App state for Excalidraw
   */
  export interface ExcalidrawAppState {
    gridSize: number | null;
    viewBackgroundColor: string;
    currentItemStrokeColor: string;
    currentItemBackgroundColor: string;
    currentItemFillStyle: string;
    currentItemStrokeWidth: number;
    currentItemStrokeStyle: string;
    currentItemRoughness: number;
    currentItemOpacity: number;
    currentItemFontFamily: number;
    currentItemFontSize: number;
    currentItemTextAlign: string;
    currentItemStrokeSharpness: string;
    currentItemStartArrowhead: null | string;
    currentItemEndArrowhead: null | string;
    currentItemLinearStrokeSharpness: null | string;
    currentItemLock: boolean;
    zenModeEnabled: boolean;
    viewModeEnabled: boolean;
    currentPageId: string;
    cursorX: number;
    cursorY: number;
    name: string;
    scrollX: number;
    scrollY: number;
    zoom: {
      value: number;
      translationX: number;
      translationY: number;
    };
    offsetLeft: number;
    offsetTop: number;
    width: number;
    height: number;
    shouldCacheIgnoreZoom: boolean;
    isBindingEnabled: boolean;
    isShowingBindingGaps: boolean;
    isSnapping: boolean;
    isGridModeEnabled: boolean;
    isLoading: boolean;
    canUndo: boolean;
    canRedo: boolean;
    past: unknown[];
    future: unknown[];
  }

  /**
   * Complete Excalidraw scene data
   */
  export interface ExcalidrawScene {
    elements: ExcalidrawElement[];
    appState: ExcalidrawAppState;
  }

  /**
   * Imperative API for Excalidraw component
   */
  export interface ExcalidrawImperativeAPI {
    /**
     * Reset the canvas to initial state
     */
    resetScene: () => void;

    /**
     * Update the entire scene
     */
    updateScene: (scene: Partial<ExcalidrawScene>) => void;

    /**
     * Get the current scene
     */
    getScene: () => ExcalidrawScene;

    /**
     * Get scene elements
     */
    getElements: () => ExcalidrawElement[];

    /**
     * Get app state
     */
    getAppState: () => ExcalidrawAppState;

    /**
     * Subscribe to scene changes
     */
    onChange: (
      callback: (elements: ExcalidrawElement[], state: ExcalidrawAppState) => void
    ) => () => void;

    /**
     * Subscribe to element pointer down
     */
    onPointerDown: (
      callback: (element: ExcalidrawElement | null, event: PointerEvent) => void
    ) => () => void;

    /**
     * Subscribe to element pointer up
     */
    onPointerUp: (
      callback: (element: ExcalidrawElement | null, event: PointerEvent) => void
    ) => () => void;

    /**
     * Subscribe to element pointer move
     */
    onPointerMove: (
      callback: (element: ExcalidrawElement | null, event: PointerEvent) => void
    ) => () => void;

    /**
     * Subscribe to element deletion
     */
    onDelete: (
      callback: (elements: ExcalidrawElement[]) => void
    ) => () => void;

    /**
     * Add elements to the scene
     */
    addElements: (elements: ExcalidrawElement[]) => void;

    /**
     * Remove elements from the scene
     */
    removeElements: (elementIds: string[]) => void;

    /**
     * Update elements in the scene
     */
    updateElements: (elements: ExcalidrawElement[]) => void;

    /**
     * Select elements
     */
    selectElements: (elements: ExcalidrawElement[]) => void;

    /**
     * Select all elements
     */
    selectAll: () => void;

    /**
     * Deselect all elements
     */
    deselectAll: () => void;

    /**
     * Copy selected elements to clipboard
     */
    copyToClipboard: () => void;

    /**
     * Paste from clipboard
     */
    pasteFromClipboard: (point: { x: number; y: number }) => void;

    /**
     * Duplicate selected elements
     */
    duplicateSelection: () => void;

    /**
     * Delete selected elements
     */
    deleteSelectedElements: () => void;

    /**
     * Undo last action
     */
    undo: () => void;

    /**
     * Redo last action
     */
    redo: () => void;

    /**
     * Zoom in
     */
    zoomIn: () => void;

    /**
     * Zoom out
     */
    zoomOut: () => void;

    /**
     * Reset zoom
     */
    resetZoom: () => void;

    /**
     * Set zoom level
     */
    setZoom: (value: number) => void;

    /**
     * Scroll to element
     */
    scrollToElement: (elementId: string) => void;

    /**
     * Scroll to content
     */
    scrollToContent: () => void;

    /**
     * Export scene to SVG
     */
    exportToSVG: () => Promise<string>;

    /**
     * Export scene to PNG
     */
    exportToPNG: () => Promise<string>;

    /**
     * Export scene to JSON
     */
    exportToJSON: () => Promise<string>;

    /**
     * Load scene from JSON
     */
    loadFromJSON: (json: string) => Promise<void>;

    /**
     * Clear the canvas
     */
    clear: () => void;
  }

  /**
   * Props for Excalidraw component
   */
  export interface ExcalidrawProps {
    /**
     * Reference to the API
     */
    ref?: ComponentRef<ExcalidrawImperativeAPI>;

    /**
     * Initial scene data
     */
    initialData?: Partial<ExcalidrawScene>;

    /**
     * Callback when scene changes
     */
    onChange?: (elements: ExcalidrawElement[], state: ExcalidrawAppState) => void;

    /**
     * UI configuration
     */
    UIOptions?: {
      canvasActions?: {
        save?: boolean;
        load?: boolean;
        export?: boolean;
        clear?: boolean;
      };
      tools?: {
        selection?: boolean;
        rectangle?: boolean;
        ellipse?: boolean;
        diamond?: boolean;
        text?: boolean;
        freedraw?: boolean;
        line?: boolean;
        arrow?: boolean;
        image?: boolean;
      };
    };

    /**
     * CSS class name
     */
    className?: string;

    /**
     * Inline styles
     */
    style?: React.CSSProperties;
  }

  /**
   * Main Excalidraw component
   */
  export const Excalidraw: ForwardRefExoticComponent<
    ExcalidrawProps & RefAttributes<ExcalidrawImperativeAPI>
  >;
}

// CSS module declaration
declare module "@excalidraw/excalidraw/styles.css" {
  const content: string;
  export default content;
}
