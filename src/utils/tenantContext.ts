import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  userId: string;
  userName?: string;
  companyId: string;
  role: string;
  tenantId?: string;
  ownerId?: string;
  staffId?: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

export const tenantContext = {
  run(store: TenantStore, callback: () => any) {
    return storage.run(store, callback);
  },
  getStore() {
    return storage.getStore();
  }
};
