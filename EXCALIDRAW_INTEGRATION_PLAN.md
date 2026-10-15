# Excalidraw Integration Plan for Forma

## Overview

**Excalidraw** is a free, MIT-licensed, open-source infinite canvas library for React. It provides similar functionality to tldraw but without licensing costs, making it ideal for commercial projects like Forma.

## Why Excalidraw?

| Feature | tldraw | Excalidraw |
|---------|--------|------------|
| License | Proprietary ($6K/year) | MIT (Free) |
| Production Use | Paid | Free |
| Self-hosting | No | Yes |
| Infinite Canvas | ✅ | ✅ |
| Custom Shapes | ✅ | ✅ |
| Collaboration | ✅ | ✅ (pluggable) |
| React Component | ✅ | ✅ |
| Mobile Support | ✅ | ✅ |

## Integration Goals

### Phase 1: Core Integration (MVP)
- [ ] Add Excalidraw as optional dependency
- [ ] Create wrapper component with FitPulse styling
- [ ] Implement basic workout visualization
- [ ] Add custom exercise shapes

### Phase 2: Workout Features
- [ ] Workout plan visualization on canvas
- [ ] Drag-and-drop exercise planning
- [ ] Visual progress tracking
- [ ] Exercise set completion markers

### Phase 3: Collaboration
- [ ] Self-hosted sync server for multiplayer
- [ ] Real-time workout session sharing
- [ ] Coach-client collaborative planning
- [ ] Cross-device synchronization

### Phase 4: Advanced Features
- [ ] AI-powered canvas annotations (Coach integration)
- [ ] Video exercise embedding
- [ ] Custom shape library for exercises
- [ ] Export to images/PDF

## Implementation Details

### 1. Installation

```bash
# Optional dependency (won't break existing functionality)
pnpm add @excalidraw/excalidraw -D
```

### 2. Type Declarations

```typescript
// apps/web/src/types/excalidraw.d.ts
declare module "@excalidraw/excalidraw" {
  // Type definitions for Excalidraw
}
```

### 3. Wrapper Component

```tsx
// apps/web/src/components/ExcalidrawCanvas.tsx
import { forwardRef, useImperativeHandle, useRef } from "react";
import type { ExcalidrawAPI } from "@excalidraw/excalidraw";

interface ExcalidrawCanvasProps {
  initialData?: any;
  onChange?: (data: any) => void;
  className?: string;
}

export const ExcalidrawCanvas = forwardRef<ExcalidrawAPI, ExcalidrawCanvasProps>(
  (props, ref) => {
    const apiRef = useRef<ExcalidrawAPI | null>(null);
    useImperativeHandle(ref, () => apiRef.current);
    
    // Dynamic import to avoid SSR issues
    const Excalidraw = require("@excalidraw/excalidraw").default;
    
    return <Excalidraw ref={apiRef} {...props} />;
  }
);
```

### 4. Workout Domain Integration

```typescript
// apps/web/src/lib/excalidraw-utils.ts
import type { WorkoutSession } from "@forma/workout-domain";
import type { ExcalidrawElement } from "@excalidraw/excalidraw";

export function workoutSessionToExcalidraw(session: WorkoutSession): ExcalidrawElement[] {
  // Convert workout session to Excalidraw elements
  return session.steps.map((step, index) => ({
    type: "exercise",
    id: `exercise-${step.snapshot.exerciseId}`,
    x: index * 200,
    y: 0,
    width: 180,
    height: 100,
    customData: {
      exerciseId: step.snapshot.exerciseId,
      name: step.snapshot.name,
      sets: step.snapshot.targetSets,
      reps: step.snapshot.targetReps,
      completed: step.completedSets.length,
    },
  }));
}

export function excalidrawToWorkoutSession(elements: ExcalidrawElement[]): Partial<WorkoutSession> {
  // Convert Excalidraw elements back to workout session
  const steps = elements
    .filter(e => e.type === "exercise")
    .map((e, index) => ({
      snapshot: e.customData as any,
      completedSets: [],
      skipped: false,
    }));
  
  return { steps };
}
```

### 5. Usage Example

```tsx
// apps/web/src/features/WorkoutPlanner.tsx
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { workoutSessionToExcalidraw } from "@/lib/excalidraw-utils";

export function WorkoutPlanner({ session }: { session: WorkoutSession }) {
  const elements = workoutSessionToExcalidraw(session);
  
  return (
    <div className="h-[600px] w-full">
      <ExcalidrawCanvas
        initialData={{ elements }}
        onChange={(data) => {
          // Handle canvas changes
          const updatedSession = excalidrawToWorkoutSession(data.elements);
          onSessionUpdate(updatedSession);
        }}
      />
    </div>
  );
}
```

## Custom Shapes

### Exercise Shape

```typescript
// Define custom shape for exercises
const ExerciseShape = {
  type: "exercise",
  component: ExerciseShapeComponent,
  props: {
    exerciseId: string;
    name: string;
    sets: number;
    reps: number;
    completed: number;
  },
};

function ExerciseShapeComponent({ exerciseId, name, sets, reps, completed }: any) {
  return (
    <div className="exercise-shape">
      <h3>{name}</h3>
      <p>{completed}/{sets} sets</p>
      <p>{reps} reps</p>
    </div>
  );
}
```

## Collaboration Setup

### Self-hosted Sync Server

```typescript
// apps/api/src/routes/excalidraw-sync.ts
import { Hono } from "hono";
import { ExcalidrawSyncServer } from "@excalidraw/excalidraw-room";

const sync = new ExcalidrawSyncServer();

const router = new Hono()
  .post("/sync/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    const body = await c.req.json();
    
    const result = sync.handleMessage(roomId, body);
    return c.json(result);
  })
  .export();

export default router;
```

### Client-side Collaboration

```tsx
// apps/web/src/components/CollaborativeCanvas.tsx
import { ExcalidrawRoom } from "@excalidraw/excalidraw-room";

export function CollaborativeCanvas({ roomId }: { roomId: string }) {
  return (
    <ExcalidrawRoom
      roomId={roomId}
      serverUrl="/api/excalidraw-sync"
      onChange={(data) => {
        // Save to our database
        saveCanvasData(roomId, data);
      }}
    />
  );
}
```

## Migration from Current System

### Current State
- Workout sessions stored in SQLite (mobile) and localStorage (web)
- Sync via outbox pattern to API
- Domain logic in `@forma/workout-domain`

### Target State
- Canvas data stored alongside workout sessions
- Real-time sync via Excalidraw Room
- Fallback to current sync for offline

### Migration Strategy
1. Add canvas data as optional field to WorkoutSession
2. Implement dual-write (canvas + domain)
3. Gradually migrate UI to canvas-based
4. Remove old sync when stable

## Benefits

### For Users
- ✅ Visual workout planning
- ✅ Interactive progress tracking
- ✅ Collaborative features with coaches
- ✅ Cross-device synchronization
- ✅ Rich annotations and notes

### For Developers
- ✅ Free and open-source
- ✅ Self-hostable (no vendor lock-in)
- ✅ Extensible architecture
- ✅ Good TypeScript support
- ✅ Active community

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase | Medium | Dynamic imports, code splitting |
| Learning curve | Low | Simple API, good documentation |
| Performance | Low | Optimized rendering, lazy loading |
| Compatibility | Low | Works with React 16+, modern browsers |
| Maintenance | Medium | Active community, regular updates |

## Next Steps

1. **Research Phase** (Current)
   - [x] Evaluate tldraw licensing
   - [x] Identify Excalidraw as alternative
   - [x] Create integration plan

2. **Prototype Phase**
   - [ ] Create proof-of-concept component
   - [ ] Test basic functionality
   - [ ] Evaluate performance

3. **Integration Phase**
   - [ ] Add Excalidraw dependency
   - [ ] Create wrapper components
   - [ ] Implement domain integration

4. **Collaboration Phase**
   - [ ] Setup sync server
   - [ ] Implement real-time features
   - [ ] Test multi-device scenarios

5. **Production Phase**
   - [ ] Performance optimization
   - [ ] Error handling
   - [ ] Monitoring and analytics

## Resources

- [Excalidraw GitHub](https://github.com/excalidraw/excalidraw)
- [Excalidraw Docs](https://docs.excalidraw.com)
- [Excalidraw Room (Collaboration)](https://github.com/excalidraw/excalidraw-room)
- [Demo](https://excalidraw.com)

## License Compliance

Excalidraw is licensed under the **MIT License**:

```
MIT License

Copyright (c) 2020 Excalidraw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

This allows **free commercial use** with no restrictions.
