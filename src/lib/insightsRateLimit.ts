import { getSessionItem, setSessionItem } from './sessionStorage';

const MAX_DAILY = 5;
const KEY = 'insights_rate_limit';

interface State { date: string; count: number }

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const insightsRateLimit = {
  max: MAX_DAILY,

  async getRemaining(): Promise<number> {
    try {
      const raw = await getSessionItem(KEY);
      if (!raw) return MAX_DAILY;
      const s: State = JSON.parse(raw);
      return s.date === today() ? Math.max(0, MAX_DAILY - s.count) : MAX_DAILY;
    } catch {
      return MAX_DAILY;
    }
  },

  async canRefresh(): Promise<boolean> {
    return (await this.getRemaining()) > 0;
  },

  async recordRefresh(): Promise<void> {
    try {
      const raw = await getSessionItem(KEY);
      let s: State = { date: today(), count: 0 };
      if (raw) {
        const parsed: State = JSON.parse(raw);
        if (parsed.date === today()) s = parsed;
      }
      s.count += 1;
      await setSessionItem(KEY, JSON.stringify(s));
    } catch {}
  },
};
