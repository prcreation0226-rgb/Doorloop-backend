import { Router } from 'express';
import { accountingController } from '../controllers/accounting.controller';

const router = Router();

router.get('/accounts', (req, res, next) => accountingController.getCoA(req, res, next));
router.post('/accounts', (req, res, next) => accountingController.createAccount(req, res, next));
router.delete('/accounts/:id', (req, res, next) => accountingController.deleteAccount(req, res, next));

router.get('/journal-entries', (req, res, next) => accountingController.getJournalEntries(req, res, next));
router.post('/journal-entries', (req, res, next) => accountingController.postJournalEntry(req, res, next));

router.get('/general-ledger', (req, res, next) => accountingController.getGeneralLedger(req, res, next));

router.get('/bank-accounts', (req, res, next) => accountingController.getBankAccounts(req, res, next));
router.post('/bank-accounts', (req, res, next) => accountingController.createBankAccount(req, res, next));
router.delete('/bank-accounts/:id', (req, res, next) => accountingController.deleteBankAccount(req, res, next));

router.get('/bank-reconciliation', (req, res, next) => accountingController.getBankReconciliation(req, res, next));

export default router;
