"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integration_controller_1 = require("../controllers/integration.controller");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => integration_controller_1.integrationController.getAll(req, res, next));
router.post('/update', (req, res, next) => integration_controller_1.integrationController.update(req, res, next));
router.post('/test', (req, res, next) => integration_controller_1.integrationController.test(req, res, next));
exports.default = router;
