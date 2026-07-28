"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_controller_1 = require("../controllers/application.controller");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => application_controller_1.applicationController.getAll(req, res, next));
router.post('/', (req, res, next) => application_controller_1.applicationController.create(req, res, next));
router.put('/:id', (req, res, next) => application_controller_1.applicationController.update(req, res, next));
exports.default = router;
