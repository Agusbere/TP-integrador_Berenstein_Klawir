import express from 'express';
import { getEvents, searchEvents, getEventById, createEvent, updateEvent, deleteEvent, enrollEvent, unenrollEvent, getEventCategories, getEventsByUser, getAllEventsWithoutLimit, isUserEnrolled } from '../controllers/eventController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getEvents);
router.get('/all', authMiddleware, getAllEventsWithoutLimit);
router.get('/my-events', authMiddleware, getEventsByUser);
router.get('/categories', getEventCategories);
router.get('/search', searchEvents);
router.get('/:id', getEventById);
router.get('/:id/enrollment/:userId', authMiddleware, isUserEnrolled);

router.post('/', authMiddleware, createEvent);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

router.post('/:id/enrollment', authMiddleware, enrollEvent);
router.delete('/:id/enrollment', authMiddleware, unenrollEvent);

export default router;
