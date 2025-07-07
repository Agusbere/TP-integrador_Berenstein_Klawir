import pool from '../database/connection.js';

// Listar eventos paginados
export const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM events ORDER BY id LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener eventos', error });
  }
};

// Buscar eventos por nombre, fecha o tag
export const searchEvents = async (req, res) => {
  try {
    const { name, startdate, tag } = req.query;
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    let idx = 1;
    if (name) {
      query += ` AND LOWER(name) LIKE $${idx++}`;
      params.push(`%${name.toLowerCase()}%`);
    }
    if (startdate) {
      query += ` AND start_date >= $${idx++}`;
      params.push(startdate);
    }
    if (tag) {
      query += ` AND $${idx++} = ANY(tags)`;
      params.push(tag);
    }
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error en búsqueda de eventos', error });
  }
};

// Detalle de un evento
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el evento', error });
  }
};

// Crear evento (requiere autenticación)
export const createEvent = async (req, res) => {
  try {
    const { name, description, id_event_category, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance } = req.body;
    const id_creator_user = req.user.id;
    if (!name || !description || !id_event_location) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const result = await pool.query(
      `INSERT INTO events (name, description, id_event_category, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, description, id_event_category, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear evento', error });
  }
};

// Editar evento (requiere autenticación y ser creador)
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const id_creator_user = req.user.id;
    // Solo permite editar si el usuario es el creador
    const event = await pool.query('SELECT * FROM events WHERE id = $1 AND id_creator_user = $2', [id, id_creator_user]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado o no autorizado' });
    }
    // Actualiza solo los campos enviados
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    let setStr = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE events SET ${setStr} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar evento', error });
  }
};

// Eliminar evento (requiere autenticación y ser creador)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const id_creator_user = req.user.id;
    const event = await pool.query('SELECT * FROM events WHERE id = $1 AND id_creator_user = $2', [id, id_creator_user]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado o no autorizado' });
    }
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.status(200).json({ message: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar evento', error });
  }
};

// Inscripción a evento
export const enrollEvent = async (req, res) => {
  try {
    const { id } = req.params; // id del evento
    const id_user = req.user.id;
    // Verifica si ya está inscripto
    const existing = await pool.query('SELECT * FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, id_user]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Ya está inscripto en el evento' });
    }
    await pool.query('INSERT INTO event_enrollments (id_event, id_user, registration_date_time) VALUES ($1, $2, NOW())', [id, id_user]);
    res.status(201).json({ message: 'Inscripción exitosa' });
  } catch (error) {
    res.status(500).json({ message: 'Error al inscribirse', error });
  }
};

// Desinscripción de evento
export const unenrollEvent = async (req, res) => {
  try {
    const { id } = req.params; // id del evento
    const id_user = req.user.id;
    const existing = await pool.query('SELECT * FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, id_user]);
    if (existing.rows.length === 0) {
      return res.status(400).json({ message: 'No está inscripto en el evento' });
    }
    await pool.query('DELETE FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, id_user]);
    res.status(200).json({ message: 'Desinscripción exitosa' });
  } catch (error) {
    res.status(500).json({ message: 'Error al desinscribirse', error });
  }
};