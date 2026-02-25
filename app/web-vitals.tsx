'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import { reportWebVitals } from '@/lib/utils/performance'

function handleMetric(metric: Metric) {
  reportWebVitals({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  })
}

export function WebVitals() {
  useEffect(() => {
    onCLS(handleMetric)
    onFCP(handleMetric)
    onINP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)
  }, [])

  return null
}
