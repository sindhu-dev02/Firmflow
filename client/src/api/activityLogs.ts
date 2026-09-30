import { apiClient } from '@/api/axios';
import type { ActivityLogEntry } from '@/types';

export const activityLogsApi = {
  list: async () => {
    const { data } = await apiClient.get<{ logs: ActivityLogEntry[] }>('/activity-logs');
    return data;
  },
};