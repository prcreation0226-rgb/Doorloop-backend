"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContext = void 0;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
exports.tenantContext = {
    run(store, callback) {
        return storage.run(store, callback);
    },
    getStore() {
        return storage.getStore();
    }
};
