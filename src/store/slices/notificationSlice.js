import { fetchWithTimeout } from '../../lib/utils';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Cookie-based auth — credentials: 'include' sends the HttpOnly cookie automatically
const credentialsOpts = { credentials: 'include' };

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const res = await fetchWithTimeout('/api/notifications', credentialsOpts);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json(); // { notifications, unreadCount }
});

export const markOneRead = createAsyncThunk('notifications/markOne', async (id) => {
  await fetchWithTimeout(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
  return id;
});

export const markAllRead = createAsyncThunk('notifications/markAll', async () => {
  await fetchWithTimeout('/api/notifications/read-all', { method: 'PATCH', credentials: 'include' });
});

export const deleteNotification = createAsyncThunk('notifications/delete', async (id) => {
  await fetchWithTimeout(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
  return id;
});

export const clearAllNotifications = createAsyncThunk('notifications/clearAll', async () => {
  await fetchWithTimeout('/api/notifications', { method: 'DELETE', credentials: 'include' });
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
  },
  reducers: {
    // Called by socket when a new notification arrives in real-time
    pushNotification(state, action) {
      state.items.unshift({ ...action.payload, read: false });
      state.unreadCount += 1;
    },
    // Reset on logout
    clearNotificationsState(state) {
      state.items = [];
      state.unreadCount = 0;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.pending, (state) => { state.loading = true; });
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload.notifications || [];
      state.unreadCount = action.payload.unreadCount || 0;
    });
    builder.addCase(fetchNotifications.rejected, (state) => { state.loading = false; });

    builder.addCase(markOneRead.fulfilled, (state, action) => {
      const item = state.items.find(n => n._id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    builder.addCase(markAllRead.fulfilled, (state) => {
      state.items.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    });

    builder.addCase(deleteNotification.fulfilled, (state, action) => {
      const idx = state.items.findIndex(n => n._id === action.payload);
      if (idx !== -1) {
        if (!state.items[idx].read) state.unreadCount = Math.max(0, state.unreadCount - 1);
        state.items.splice(idx, 1);
      }
    });

    builder.addCase(clearAllNotifications.fulfilled, (state) => {
      state.items = [];
      state.unreadCount = 0;
    });
  },
});

export const { pushNotification, clearNotificationsState } = notificationSlice.actions;
export default notificationSlice.reducer;
