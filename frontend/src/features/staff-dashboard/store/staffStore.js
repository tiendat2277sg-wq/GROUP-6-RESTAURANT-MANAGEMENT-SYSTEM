import { getAuthToken } from "@/core/api/httpClient.js";
import { create } from 'zustand';
import { fetchStaffTables, fetchActiveStaffOrders } from '../services/staffApi';
import { asArray } from '@/core/utils/asArray';
import { coalesceAsync } from '@/core/utils/coalesceAsync.js';

import io from 'socket.io-client';
import { SOCKET_URL } from "@/core/socket/socketConfig.js";

let socket = null;

// Socket bursts (several table/order events in a row) used to fire one HTTP request per event and
// the slowest response could overwrite a newer one. Now: at most one request in flight per kind,
// and one trailing re-run if more events arrived meanwhile, so the final state is always fresh.
const loadTables = coalesceAsync(async set => {
  try {
    const res = await fetchStaffTables();
    set({ tables: asArray(res.data) });
  } catch (err) {
    console.error('Could not load tables', err);
  }
});
const loadOrders = coalesceAsync(async set => {
  try {
    const res = await fetchActiveStaffOrders();
    set({ orderTables: asArray(res.data) });
  } catch (err) {
    console.error('Could not load orders', err);
  }
});

export const useStaffStore = create((set, get) => ({
  // Global State
  tables: [],
  orderTables: [],
  loading: true,
  refreshing: false,
  staffRole: '',
  selectedTableIdForModal: null,

  // Actions
  setTables: (tables) => set((state) => ({
    tables: typeof tables === 'function' ? asArray(tables(state.tables)) : asArray(tables),
  })),
  setOrderTables: (orderTables) => set((state) => ({
    orderTables: typeof orderTables === 'function' ? asArray(orderTables(state.orderTables)) : asArray(orderTables),
  })),
  setStaffRole: (role) => set({ staffRole: role }),
  openTableModal: (tableId) => set({ selectedTableIdForModal: tableId }),
  closeTableModal: () => set({ selectedTableIdForModal: null }),

  refetchTables: async (showIndicator = false) => {
    if (showIndicator) set({ refreshing: true });
    try {
      await loadTables(set);
    } finally {
      if (showIndicator) set({ refreshing: false });
    }
  },

  refetchOrders: async (showIndicator = false) => {
    if (showIndicator) set({ refreshing: true });
    try {
      await loadOrders(set);
    } finally {
      if (showIndicator) set({ refreshing: false });
    }
  },

  refreshAll: async (showIndicator = false) => {
    if (showIndicator) set({ refreshing: true });
    try {
      await Promise.all([get().refetchTables(false), get().refetchOrders(false)]);
    } finally {
      if (showIndicator) set({ refreshing: false });
    }
  },

  bootstrap: async (role) => {
    set({ loading: true, staffRole: role });
    await get().refreshAll(false);
    set({ loading: false });
  },

  initSocket: () => {
    if (socket) return; // Already initialized

    // FIX: Replaced process.env with import.meta.env for Vite compatibility
    const socketUrl = SOCKET_URL;
    socket = io(socketUrl, {
      auth: done => done({token:getAuthToken()}),
      withCredentials: true,
      transports: ["websocket"]
    });

    socket.on('connect', () => {
      socket.emit('joinRoom', 'staff');
    });

    socket.on('kitchen:dish_ready', () => {
      get().refetchOrders(false);
    });

    socket.on('kitchen:dish_cancelled', () => {
      get().refetchOrders(false);
    });

    socket.on('PAYMENT_STATUS_CHANGED', () => {
      get().refreshAll(false);
    });

    socket.on('ORDER_FORCE_SETTLED', () => {
      get().refreshAll(false);
    });

    socket.on('table:status_updated', () => {
      get().refreshAll(false);
    });

    socket.on('table:sync', () => {
      get().refreshAll(false);
    });

    socket.on('table:status_changed', (data = {}) => {
      const table_id = data.table_id ?? data.tableId;
      const table_status = data.table_status ?? data.status;
      if (!table_id || !table_status) {
        get().refreshAll(false);
        return;
      }

      set((state) => ({
        tables: state.tables.map(t => 
          t.table_id === table_id
            ? {
                ...t,
                ...data,
                table_id,
                table_status,
                status: table_status,
              }
            : t
        )
      }));

      if (!data.estimated_release_at) {
        get().refetchTables(false);
      }
    });
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
}));
