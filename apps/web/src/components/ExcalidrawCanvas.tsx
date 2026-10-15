/**
 * Excalidraw Canvas Component
 * 
 * Free, MIT-licensed infinite canvas for React.
 * Used for workout visualization, planning, and collaborative features.
 * 
 * Features:
 * - Infinite canvas with zoom/pan
 * - Custom shapes for exercises
 * - Freehand drawing
 * - Touch support
 * - Export to SVG/PNG
 * - Self-hostable collaboration
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI, ExcalidrawElement } from "@excalidraw/excalidraw";

// Lazy load Excalidraw to reduce initial bundle size
let ExcalidrawComponent: any = null;
let stylesLoaded = false;

async function loadExcalidraw() {
  if (ExcalidrawComponent) return;
  
  try {
    const [module] = await Promise.all([
      import("@excalidraw/excalidraw"),
      import("@excalidraw/excalidraw/styles.css"),
    ]);
    ExcalidrawComponent = module.Excalidraw;
    stylesLoaded = true;
  } catch (err) {
    console.warn("Failed to load Excalidraw", err);
  }
}

/**
 * Props for ExcalidrawCanvas component
 */
export interface ExcalidrawCanvasProps {
  /** Initial data to load into the canvas */
  initialData?: {
    elements: ExcalidrawElement[];
    appState?: any;
  };
  
  /** Callback when canvas elements change */
  onChange?: (elements: ExcalidrawElement[], state: any) => void;
  
  /** Callback when an element is clicked */
  onElementClick?: (element: ExcalidrawElement) => void;
  
  /** UI configuration */
  UIOptions?: {
    canvasActions?: Record<string, boolean>;
  };
  
  /** CSS class for the container */
  className?: string;
  
  /** Whether to show loading state */
  showLoading?: boolean;
}

/**
 * Excalidraw Canvas with FitPulse integration
 */
export const ExcalidrawCanvas = forwardRef<ExcalidrawImperativeAPI, ExcalidrawCanvasProps>(
  (props, ref) => {
    const { initialData, onChange, onElementClick, UIOptions, className, showLoading = true } = props;
    const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => apiRef.current!, [apiRef.current]);

    // Load Excalidraw dynamically
    useEffect(() => {
      loadExcalidraw().then(() => {
        setIsLoaded(true);
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load canvas");
      });
    }, []);

    // Handle element clicks
    useEffect(() => {
      if (!apiRef.current || !onElementClick) return;

      const unsubscribe = apiRef.current.onChange((elements, state) => {
        onChange?.(elements, state);
        
        // Check for recently added/clicked elements
        const clickedElements = elements.filter((e: any) => e.customData?.clicked);
        clickedElements.forEach((element: any) => {
          onElementClick(element);
          // Remove click marker
          element.customData.clicked = false;
        });
      });

      return () => unsubscribe();
    }, [onChange, onElementClick]);

    // Handle external changes to initialData
    useEffect(() => {
      if (apiRef.current && initialData) {
        apiRef.current.updateScene(initialData);
      }
    }, [initialData]);

    if (error) {
      return (
        <div className={className}>
          <p className="text-danger text-sm">{error}</p>
        </div>
      );
    }

    if (!isLoaded && showLoading) {
      return (
        <div className={className}>
          <p className="text-muted text-sm">Loading canvas...</p>
        </div>
      );
    }

    if (!ExcalidrawComponent) {
      return (
        <div className={className}>
          <p className="text-muted text-sm">Canvas unavailable</p>
        </div>
      );
    }

    return (
      <ExcalidrawComponent
        ref={apiRef}
        initialData={initialData}
        onChange={onChange}
        UIOptions={{
          canvasActions: {
            save: false,
            load: false,
            export: true,
            clear: true,
            ...UIOptions?.canvasActions,
          },
        }}
        className={className}
      />
    );
  }
);

ExcalidrawCanvas.displayName = "ExcalidrawCanvas";

// Re-export types
export type { ExcalidrawImperativeAPI, ExcalidrawElement };
