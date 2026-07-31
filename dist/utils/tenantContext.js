"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContext = exports.tenantContextStorage = void 0;
const async_hooks_1 = require("async_hooks");
exports.tenantContextStorage = new async_hooks_1.AsyncLocalStorage();
exports.tenantContext = {
    run(context, callback) {
        return exports.tenantContextStorage.run(context, callback);
    },
    getStore() {
        return exports.tenantContextStorage.getStore();
    },
    getCompanyId() {
        return exports.tenantContextStorage.getStore()?.companyId;
    },
    getUserId() {
        return exports.tenantContextStorage.getStore()?.userId;
    },
    getRole() {
        return exports.tenantContextStorage.getStore()?.role;
    },
    getTenantId() {
        return exports.tenantContextStorage.getStore()?.tenantId;
    },
    getOwnerId() {
        return exports.tenantContextStorage.getStore()?.ownerId;
    },
    getStaffId() {
        return exports.tenantContextStorage.getStore()?.staffId;
    }
};
