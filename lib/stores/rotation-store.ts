import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RotationState {
  angle: number
  isPaused: boolean
  mode: 'fixed' | 'continuous'
  interval: number
  setAngle: (angle: number) => void
  togglePause: () => void
  setMode: (mode: 'fixed' | 'continuous') => void
  setInterval: (interval: number) => void
  reset: () => void
}

const DEFAULT_STATE = {
  angle: 0,
  isPaused: false,
  mode: 'continuous' as const,
  interval: 10,
}

function sanitizeAngle(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_STATE.angle
  }

  return Math.max(-25, Math.min(25, value))
}

function sanitizeInterval(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_STATE.interval
  }

  return Math.max(5, Math.min(60, Math.round(value)))
}

function sanitizeMode(value: unknown): 'fixed' | 'continuous' {
  return value === 'fixed' || value === 'continuous' ? value : DEFAULT_STATE.mode
}

function sanitizePaused(value: unknown): boolean {
  return typeof value === 'boolean' ? value : DEFAULT_STATE.isPaused
}

export const useRotationStore = create<RotationState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setAngle: (angle) => set({ angle }),
      togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
      setMode: (mode) => set({ mode }),
      setInterval: (interval) => set({ interval }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'rotation-storage',
      // Skip automatic hydration for SSR compatibility
      // Manual rehydration is triggered in TiltWrapper after mount
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<RotationState>

        return {
          ...currentState,
          angle: sanitizeAngle(persisted.angle),
          interval: sanitizeInterval(persisted.interval),
          mode: sanitizeMode(persisted.mode),
          isPaused: sanitizePaused(persisted.isPaused),
        }
      },
    }
  )
)
