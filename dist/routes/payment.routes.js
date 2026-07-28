"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => payment_controller_1.paymentController.getAll(req, res, next));
router.post('/', (req, res, next) => payment_controller_1.paymentController.processPayment(req, res, next));
exports.default = router;
