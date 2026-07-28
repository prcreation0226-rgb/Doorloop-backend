"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_js_1 = require("../controllers/dashboard.controller.js");
const router = (0, express_1.Router)();
router.get('/metrics', (req, res, next) => dashboard_controller_js_1.dashboardController.getMetrics(req, res, next));
router.get('/charts', (req, res, next) => dashboard_controller_js_1.dashboardController.getChartData(req, res, next));
exports.default = router;
