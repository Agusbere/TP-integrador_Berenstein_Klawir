import express from 'express';
import { getAllEventLocations, getEventLocationById, createEventLocation, updateEventLocation, deleteEventLocation } from '../controllers/eventLocationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getAllEventLocations);
router.get('/:id', authMiddleware, getEventLocationById);
router.post('/', authMiddleware, createEventLocation);
router.put('/:id', authMiddleware, updateEventLocation);
router.delete('/:id', authMiddleware, deleteEventLocation);

export default router;
