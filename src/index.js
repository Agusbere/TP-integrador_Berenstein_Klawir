import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import userRoutes from './routes/userRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import eventLocationRoutes from './routes/eventLocationRoutes.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/user', userRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/event-location', eventLocationRoutes);

app.get('/', (req, res) => {
  res.send('API + APP EVENTOS - NodeJs funcionando');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});