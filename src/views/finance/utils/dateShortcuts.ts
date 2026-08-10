import dayjs from 'dayjs'

export interface FinanceDateShortcut {
  text: string
  value: () => Date
}

export interface FinanceDateRangeShortcut {
  text: string
  value: () => [Date, Date]
}

const dayStart = (offsetDays = 0) => dayjs().add(offsetDays, 'day').startOf('day').toDate()

export const financeDateShortcuts: FinanceDateShortcut[] = [
  { text: '今日', value: () => dayStart() },
  { text: '昨日', value: () => dayStart(-1) },
  { text: '7 日前', value: () => dayStart(-7) },
  { text: '本月初', value: () => dayjs().startOf('month').startOf('day').toDate() }
]

export const financeDateRangeShortcuts: FinanceDateRangeShortcut[] = [
  { text: '今日', value: () => [dayStart(), dayStart()] },
  { text: '昨日', value: () => [dayStart(-1), dayStart(-1)] },
  { text: '近 7 日', value: () => [dayStart(-6), dayStart()] },
  { text: '近 30 日', value: () => [dayStart(-29), dayStart()] },
  {
    text: '本月',
    value: () => [dayjs().startOf('month').startOf('day').toDate(), dayStart()]
  },
  {
    text: '今年',
    value: () => [dayjs().startOf('year').startOf('day').toDate(), dayStart()]
  }
]

export const filterFinanceDateShortcuts = (
  disabledDate: (date: Date) => boolean
): FinanceDateShortcut[] =>
  financeDateShortcuts.filter((shortcut) => !disabledDate(shortcut.value()))
