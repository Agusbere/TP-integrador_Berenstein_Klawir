import express from 'express';
import * as eventController from '../controllers/eventController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', eventController.getEvents);
router.get('/search', eventController.searchEvents);
router.get('/:id', eventController.getEventById);

router.post('/', authMiddleware, eventController.createEvent);
router.put('/:id', authMiddleware, eventController.updateEvent);
router.delete('/:id', authMiddleware, eventController.deleteEvent);

router.post('/:id/enrollment', authMiddleware, eventController.enrollEvent);
router.delete('/:id/enrollment', authMiddleware, eventController.unenrollEvent);

export default router;
