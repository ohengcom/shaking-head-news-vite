import { auth } from '@/lib/auth'
import { getStorageItem, setStorageItem, getMultipleStorageItems, StorageKeys } from '@/lib/storage'
import { UserStatsSchema, RotationRecord, UserStats } from '@/types/stats'
import { AuthError, logError, validateOrThrow } from '@/lib/utils/error-handler'
import { rateLimitByUser, RateLimitTiers } from '@/lib/rate-limit'

const MAX_ROTATION_BATCH_COUNT = 300

function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function normalizeStatsDate(date?: string): string {
  if (!date) {
    return formatLocalDate()
  }

  const parsedDate = parseLocalDate(date)
  return parsedDate ? formatLocalDate(parsedDate) : formatLocalDate()
}

async function getStatsForDateRange(referenceDate: string, daysBack: number) {
  const end = parseLocalDate(referenceDate) ?? new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - daysBack)

  return await getStats(formatLocalDate(start), formatLocalDate(end))
}

export async function recordRotation(angle: number, duration: number, count = 1, date?: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { error: 'UNAUTHORIZED' }
    }

    const rateLimitResult = await rateLimitByUser(session.user.id, {
      ...RateLimitTiers.RELAXED,
    })

    if (!rateLimitResult.success) {
      console.warn('Rate limit exceeded for recordRotation')
      return { error: 'RATE_LIMIT' }
    }

    if (typeof angle !== 'number' || typeof duration !== 'number' || typeof count !== 'number') {
      throw new Error('Invalid input parameters')
    }

    if (!Number.isInteger(count) || count < 1 || count > MAX_ROTATION_BATCH_COUNT) {
      throw new Error(`Count must be an integer between 1 and ${MAX_ROTATION_BATCH_COUNT}`)
    }

    if (angle < -180 || angle > 180) {
      throw new Error('Angle must be between -180 and 180')
    }

    if (duration < 0 || duration > 3600) {
      throw new Error('Duration must be between 0 and 3600 seconds')
    }

    const today = normalizeStatsDate(date)
    const key = StorageKeys.userStats(session.user.id, today)
    const existingStats = await getStorageItem<UserStats>(key)

    const stats: UserStats = existingStats || {
      userId: session.user.id,
      date: today,
      rotationCount: 0,
      totalDuration: 0,
      records: [],
    }

    const record: RotationRecord = {
      timestamp: Date.now(),
      angle,
      duration,
      ...(count > 1 ? { count } : {}),
    }

    stats.rotationCount += count
    stats.totalDuration += duration
    stats.records.push(record)

    if (stats.records.length > 100) {
      stats.records = stats.records.slice(-100)
    }

    const validatedStats = validateOrThrow(UserStatsSchema, stats)
    await setStorageItem(key, validatedStats, 60 * 60 * 24 * 90)

    return validatedStats
  } catch (error) {
    logError(error, {
      action: 'recordRotation',
      duration,
      count,
      date,
    })
    return {
      error: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function getStats(startDate: string, endDate: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to view statistics')
    }

    const rateLimitResult = await rateLimitByUser(session.user.id, {
      ...RateLimitTiers.STANDARD,
    })

    if (!rateLimitResult.success) {
      throw new Error('Too many requests. Please try again later.')
    }

    const start = parseLocalDate(startDate)
    const end = parseLocalDate(endDate)

    if (!start || !end) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 365) {
      throw new Error('Date range cannot exceed 365 days')
    }

    if (start > end) {
      throw new Error('Start date must be before end date')
    }

    const stats: UserStats[] = []
    const dateKeys: string[] = []
    const dateStrings: string[] = []

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = formatLocalDate(date)
      dateStrings.push(dateStr)
      dateKeys.push(StorageKeys.userStats(session.user.id, dateStr))
    }

    const rawResults = await getMultipleStorageItems(dateKeys)

    rawResults.forEach((raw, index) => {
      if (raw) {
        try {
          stats.push(validateOrThrow(UserStatsSchema, raw))
        } catch (error) {
          logError(error, {
            action: 'getStats',
            date: dateStrings[index],
          })
        }
      }
    })

    return stats
  } catch (error) {
    logError(error, {
      action: 'getStats',
      startDate,
      endDate,
    })
    throw error
  }
}

export async function getTodayStats(referenceDate = formatLocalDate()) {
  const today = normalizeStatsDate(referenceDate)
  const stats = await getStats(today, today)
  return stats[0] || null
}

export async function getWeekStats() {
  return await getStatsForDateRange(formatLocalDate(), 6)
}

export async function getMonthStats() {
  return await getStatsForDateRange(formatLocalDate(), 29)
}

export async function getSummaryStats(referenceDate = formatLocalDate()) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to view statistics')
    }

    const normalizedDate = normalizeStatsDate(referenceDate)
    const [todayStats, weekStats, monthStats] = await Promise.all([
      getTodayStats(normalizedDate).catch(() => null),
      getStatsForDateRange(normalizedDate, 6).catch(() => []),
      getStatsForDateRange(normalizedDate, 29).catch(() => []),
    ])

    const weekTotal = weekStats.reduce(
      (acc, stat) => ({
        count: acc.count + stat.rotationCount,
        duration: acc.duration + stat.totalDuration,
      }),
      { count: 0, duration: 0 }
    )

    const monthTotal = monthStats.reduce(
      (acc, stat) => ({
        count: acc.count + stat.rotationCount,
        duration: acc.duration + stat.totalDuration,
      }),
      { count: 0, duration: 0 }
    )

    return {
      today: {
        count: todayStats?.rotationCount || 0,
        duration: todayStats?.totalDuration || 0,
      },
      week: weekTotal,
      month: monthTotal,
      dailyData: weekStats.map((stat) => ({
        date: stat.date,
        count: stat.rotationCount,
        duration: stat.totalDuration,
      })),
      monthlyData: monthStats.map((stat) => ({
        date: stat.date,
        count: stat.rotationCount,
        duration: stat.totalDuration,
      })),
    }
  } catch (error) {
    logError(error, {
      action: 'getSummaryStats',
      referenceDate,
    })
    throw error
  }
}

export async function checkHealthReminder(referenceDate = formatLocalDate()) {
  const session = await auth()

  if (!session?.user?.id) {
    return { shouldRemind: false, lastRotationTime: null }
  }

  const todayStats = await getTodayStats(referenceDate)

  if (!todayStats || todayStats.records.length === 0) {
    return { shouldRemind: false, lastRotationTime: null }
  }

  const lastRecord = todayStats.records[todayStats.records.length - 1]
  const lastRotationTime = lastRecord.timestamp
  const now = Date.now()
  const twoHoursInMs = 2 * 60 * 60 * 1000
  const shouldRemind = now - lastRotationTime > twoHoursInMs

  return { shouldRemind, lastRotationTime }
}

export async function checkDailyGoal(dailyGoal: number) {
  const todayStats = await getTodayStats()

  if (!todayStats) {
    return {
      achieved: false,
      current: 0,
      goal: dailyGoal,
      progress: 0,
    }
  }

  const achieved = todayStats.rotationCount >= dailyGoal
  const progress = Math.min((todayStats.rotationCount / dailyGoal) * 100, 100)

  return {
    achieved,
    current: todayStats.rotationCount,
    goal: dailyGoal,
    progress,
  }
}
