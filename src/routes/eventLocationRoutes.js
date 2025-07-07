import express from 'express';
import * as eventLocationController from '../controllers/eventLocationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, eventLocationController.getAllEventLocations);
router.get('/:id', authMiddleware, eventLocationController.getEventLocationById);
router.post('/', authMiddleware, eventLocationController.createEventLocation);
router.put('/:id', authMiddleware, eventLocationController.updateEventLocation);
router.delete('/:id', authMiddleware, eventLocationController.deleteEventLocation);

export default router;
