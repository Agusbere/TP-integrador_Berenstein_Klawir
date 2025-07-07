import pool from '../database/connection.js';

export const getAllEventLocations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM event_locations WHERE id_creator_user = $1 ORDER BY id LIMIT $2 OFFSET $3', [userId, limit, offset]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ubicaciones', error });
  }
};

export const getEventLocationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM event_locations WHERE id = $1 AND id_creator_user = $2', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ubicación no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la ubicación', error });
  }
};

export const createEventLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id_location, name, full_address, max_capacity, latitude, longitude } = req.body;
    if (!id_location || !name || !full_address) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const result = await pool.query(
      `INSERT INTO event_locations (id_location, name, full_address, max_capacity, latitude, longitude, id_creator_user)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id_location, name, full_address, max_capacity, latitude, longitude, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear ubicación', error });
  }
};

export const updateEventLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const location = await pool.query('SELECT * FROM event_locations WHERE id = $1 AND id_creator_user = $2', [id, userId]);
    if (location.rows.length === 0) {
      return res.status(404).json({ message: 'Ubicación no encontrada o no autorizada' });
    }
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    let setStr = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE event_locations SET ${setStr} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar ubicación', error });
  }
};

export const deleteEventLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const location = await pool.query('SELECT * FROM event_locations WHERE id = $1 AND id_creator_user = $2', [id, userId]);
    if (location.rows.length === 0) {
      return res.status(404).json({ message: 'Ubicación no encontrada o no autorizada' });
    }
    await pool.query('DELETE FROM event_locations WHERE id = $1', [id]);
    res.status(200).json({ message: 'Ubicación eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar ubicación', error });
  }
};
