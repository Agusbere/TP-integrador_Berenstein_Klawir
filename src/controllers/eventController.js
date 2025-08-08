import pool from '../database/connection.js';

export const getEventCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, display_order 
      FROM event_categories 
      ORDER BY display_order ASC, name ASC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías de eventos', error: error.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query(`
      SELECT 
        events.*, 
        event_locations.id AS event_location_id,
        event_locations.name AS event_location_name,
        event_locations.full_address,
        event_locations.max_capacity,
        event_locations.latitude AS event_location_latitude,
        event_locations.longitude AS event_location_longitude,
        locations.id AS location_id,
        locations.name AS location_name,
        locations.id_province,
        locations.latitude AS location_latitude,
        locations.longitude AS location_longitude,
        provinces.id AS province_id,
        provinces.name AS province_name,
        users.id AS creator_user_id,
        users.first_name AS creator_first_name,
        users.last_name AS creator_last_name,
        users.username AS creator_username,
        event_categories.id AS event_category_id,
        event_categories.name AS event_category_name,
        event_categories.display_order AS event_category_display_order
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      INNER JOIN event_categories ON events.id_event_category = event_categories.id
      ORDER BY events.id
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener eventos', error: error.message, stack: error.stack });
  }
};

export const searchEvents = async (req, res) => {
  try {
    const { name, startdate, tag } = req.query;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (name) {
      whereConditions.push(`LOWER(events.name) LIKE LOWER($${paramIndex})`);
      params.push(`%${name}%`);
      paramIndex++;
    }

    if (startdate) {
      whereConditions.push(`events.start_date >= $${paramIndex}`);
      params.push(startdate);
      paramIndex++;
    }

    if (tag) {
      whereConditions.push(`events.id IN (SELECT event_tags.id_event FROM event_tags INNER JOIN tags ON event_tags.id_tag = tags.id WHERE LOWER(tags.name) = LOWER($${paramIndex}))`);
      params.push(tag);
      paramIndex++;
    }

    const whereStr = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        events.*, 
        event_locations.id AS event_location_id,
        event_locations.name AS event_location_name,
        event_locations.full_address,
        event_locations.max_capacity,
        event_locations.latitude AS event_location_latitude,
        event_locations.longitude AS event_location_longitude,
        locations.id AS location_id,
        locations.name AS location_name,
        locations.id_province,
        locations.latitude AS location_latitude,
        locations.longitude AS location_longitude,
        provinces.id AS province_id,
        provinces.name AS province_name,
        users.id AS creator_user_id,
        users.first_name AS creator_first_name,
        users.last_name AS creator_last_name,
        users.username AS creator_username,
        event_categories.id AS event_category_id,
        event_categories.name AS event_category_name,
        event_categories.display_order AS event_category_display_order
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      INNER JOIN event_categories ON events.id_event_category = event_categories.id
      ${whereStr}
      ORDER BY events.id
    `, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error en búsqueda de eventos', error });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    const result = await pool.query(`
      SELECT 
        events.*, 
        event_locations.id AS event_location_id,
        event_locations.name AS event_location_name,
        event_locations.full_address,
        event_locations.max_capacity,
        event_locations.latitude AS event_location_latitude,
        event_locations.longitude AS event_location_longitude,
        locations.id AS location_id,
        locations.name AS location_name,
        locations.id_province,
        locations.latitude AS location_latitude,
        locations.longitude AS location_longitude,
        provinces.id AS province_id,
        provinces.name AS province_name,
        users.id AS creator_user_id,
        users.first_name AS creator_first_name,
        users.last_name AS creator_last_name,
        users.username AS creator_username,
        event_categories.id AS event_category_id,
        event_categories.name AS event_category_name,
        event_categories.display_order AS event_category_display_order
      FROM events
      LEFT JOIN event_locations ON events.id_event_location = event_locations.id
      LEFT JOIN locations ON event_locations.id_location = locations.id
      LEFT JOIN provinces ON locations.id_province = provinces.id
      LEFT JOIN users ON events.id_creator_user = users.id
      LEFT JOIN event_categories ON events.id_event_category = event_categories.id
      WHERE events.id = $1
    `, [parseInt(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    const tagsResult = await pool.query(`
      SELECT tags.id, tags.name
      FROM event_tags
      INNER JOIN tags ON event_tags.id_tag = tags.id
      WHERE event_tags.id_event = $1
    `, [id]);
    const event = result.rows[0];
    event.tags = tagsResult.rows;
    res.status(200).json(event);
  } catch (error) {
    console.error('Error en getEventById:', error);
    res.status(500).json({ message: 'Error al obtener el evento', error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { name, description, id_event_category, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, tags } = req.body;
    const id_creator_user = req.user.id;
    if (!name || name.length < 3 || !description || description.length < 3) {
      return res.status(400).json({ message: 'El nombre o descripción están vacíos o tienen menos de tres (3) letras.' });
    }
    
    if (id_event_category) {
      const category = await pool.query('SELECT id FROM event_categories WHERE id = $1', [id_event_category]);
      if (category.rows.length === 0) {
        return res.status(400).json({ message: 'Categoría de evento inexistente.' });
      }
    }
    
    const loc = await pool.query('SELECT max_capacity FROM event_locations WHERE id = $1', [id_event_location]);
    if (loc.rows.length === 0) {
      return res.status(400).json({ message: 'Ubicación de evento inexistente.' });
    }
    if (max_assistance > loc.rows[0].max_capacity) {
      return res.status(400).json({ message: 'max_assistance no puede ser mayor que max_capacity.' });
    }
    if (price < 0 || duration_in_minutes < 0) {
      return res.status(400).json({ message: 'El precio o duración no pueden ser menores que cero.' });
    }
    const result = await pool.query(
      `INSERT INTO events (name, description, id_event_category, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, description, id_event_category, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user]
    );
    const event = result.rows[0];
    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
        await pool.query('INSERT INTO event_tags (id_event, id_tag) VALUES ($1, $2)', [event.id, tagId]);
      }
    }
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear evento', error });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const id_creator_user = req.user.id;
    const event = await pool.query('SELECT * FROM events WHERE id = $1 AND id_creator_user = $2', [id, id_creator_user]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado o no autorizado' });
    }
    const { name, description, id_event_category, id_event_location, max_assistance, price, duration_in_minutes, tags } = req.body;
    if (name && name.length < 3) {
      return res.status(400).json({ message: 'El nombre debe tener al menos 3 letras.' });
    }
    if (description && description.length < 3) {
      return res.status(400).json({ message: 'La descripción debe tener al menos 3 letras.' });
    }
    
    if (id_event_category) {
      const category = await pool.query('SELECT id FROM event_categories WHERE id = $1', [id_event_category]);
      if (category.rows.length === 0) {
        return res.status(400).json({ message: 'Categoría de evento inexistente.' });
      }
    }
    
    if (id_event_location) {
      const loc = await pool.query('SELECT max_capacity FROM event_locations WHERE id = $1', [id_event_location]);
      if (loc.rows.length === 0) {
        return res.status(400).json({ message: 'Ubicación de evento inexistente.' });
      }
      if (max_assistance && max_assistance > loc.rows[0].max_capacity) {
        return res.status(400).json({ message: 'max_assistance no puede ser mayor que max_capacity.' });
      }
    }
    if (price && price < 0) {
      return res.status(400).json({ message: 'El precio no puede ser menor que cero.' });
    }
    if (duration_in_minutes && duration_in_minutes < 0) {
      return res.status(400).json({ message: 'La duración no puede ser menor que cero.' });
    }
    let updateFields = [];
    let updateParams = [];
    let paramIdx = 1;
    if (name) {
      updateFields.push(`name = $${paramIdx++}`);
      updateParams.push(name);
    }
    if (description) {
      updateFields.push(`description = $${paramIdx++}`);
      updateParams.push(description);
    }
    if (id_event_category) {
      updateFields.push(`id_event_category = $${paramIdx++}`);
      updateParams.push(id_event_category);
    }
    if (id_event_location) {
      updateFields.push(`id_event_location = $${paramIdx++}`);
      updateParams.push(id_event_location);
    }
    if (max_assistance) {
      updateFields.push(`max_assistance = $${paramIdx++}`);
      updateParams.push(max_assistance);
    }
    if (price) {
      updateFields.push(`price = $${paramIdx++}`);
      updateParams.push(price);
    }
    if (duration_in_minutes) {
      updateFields.push(`duration_in_minutes = $${paramIdx++}`);
      updateParams.push(duration_in_minutes);
    }
    if (updateFields.length > 0) {
      const updateQuery = `UPDATE events SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`;
      updateParams.push(id);
      await pool.query(updateQuery, updateParams);
    }
    if (tags && Array.isArray(tags)) {
      await pool.query('DELETE FROM event_tags WHERE id_event = $1', [id]);
      for (const tagId of tags) {
        await pool.query('INSERT INTO event_tags (id_event, id_tag) VALUES ($1, $2)', [id, tagId]);
      }
    }
    res.status(200).json({ message: 'Evento actualizado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar evento', error });
  }
};

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

export const enrollEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const id_user = req.user.id;
    const existing = await pool.query('SELECT * FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, id_user]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya está registrado en el evento.' });
    }
    const event = await pool.query('SELECT max_assistance, enabled_for_enrollment, start_date FROM events WHERE id = $1', [id]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    const { max_assistance, enabled_for_enrollment, start_date } = event.rows[0];
    const count = await pool.query('SELECT COUNT(*) FROM event_enrollments WHERE id_event = $1', [id]);
    if (parseInt(count.rows[0].count) >= max_assistance) {
      return res.status(400).json({ message: 'Excedida la capacidad máxima de registrados (max_assistance) al evento.' });
    }
    if (new Date(start_date) <= new Date()) {
      return res.status(400).json({ message: 'No se puede registrar a un evento que ya sucedió (start_date).' });
    }
    if (!enabled_for_enrollment) {
      return res.status(400).json({ message: 'El evento no está habilitado para inscripción (enabled_for_enrollment).' });
    }
    await pool.query('INSERT INTO event_enrollments (id_event, id_user, registration_date_time) VALUES ($1, $2, NOW())', [id, id_user]);
    res.status(201).json({ message: 'Inscripción exitosa' });
  } catch (error) {
    res.status(500).json({ message: 'Error al inscribirse', error });
  }
};

export const unenrollEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const id_user = req.user.id;
    const existing = await pool.query('SELECT * FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, id_user]);
    if (existing.rows.length === 0) {
      return res.status(400).json({ message: 'El usuario no se encuentra registrado al evento.' });
    }
    const event = await pool.query('SELECT start_date FROM events WHERE id = $1', [id]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    if (new Date(event.rows[0].start_date) <= new Date()) {
      return res.status(400).json({ message: 'No se puede remover de un evento que ya sucedió (start_date).' });
    }
    await pool.query('DELETE FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, id_user]);
    res.status(200).json({ message: 'Desinscripción exitosa' });
  } catch (error) {
    res.status(500).json({ message: 'Error al desinscribirse', error });
  }
};

export const isUserEnrolled = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const result = await pool.query('SELECT 1 FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [id, userId]);
    const enrolled = result.rows.length > 0;
    res.status(200).json({ enrolled });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar inscripción', error: error.message });
  }
};

export const getEventsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT 
        events.*, 
        event_locations.id AS event_location_id,
        event_locations.name AS event_location_name,
        event_locations.full_address,
        event_locations.max_capacity,
        event_locations.latitude AS event_location_latitude,
        event_locations.longitude AS event_location_longitude,
        locations.id AS location_id,
        locations.name AS location_name,
        locations.id_province,
        locations.latitude AS location_latitude,
        locations.longitude AS location_longitude,
        provinces.id AS province_id,
        provinces.name AS province_name,
        users.id AS creator_user_id,
        users.first_name AS creator_first_name,
        users.last_name AS creator_last_name,
        users.username AS creator_username,
        event_categories.id AS event_category_id,
        event_categories.name AS event_category_name,
        event_categories.display_order AS event_category_display_order
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      INNER JOIN event_categories ON events.id_event_category = event_categories.id
      WHERE events.id_creator_user = $1
      ORDER BY events.start_date DESC
    `, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener eventos del usuario', error: error.message });
  }
};

export const getAllEventsWithoutLimit = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        events.*, 
        event_locations.id AS event_location_id,
        event_locations.name AS event_location_name,
        event_locations.full_address,
        event_locations.max_capacity,
        event_locations.latitude AS event_location_latitude,
        event_locations.longitude AS event_location_longitude,
        locations.id AS location_id,
        locations.name AS location_name,
        locations.id_province,
        locations.latitude AS location_latitude,
        locations.longitude AS location_longitude,
        provinces.id AS province_id,
        provinces.name AS province_name,
        users.id AS creator_user_id,
        users.first_name AS creator_first_name,
        users.last_name AS creator_last_name,
        users.username AS creator_username,
        event_categories.id AS event_category_id,
        event_categories.name AS event_category_name,
        event_categories.display_order AS event_category_display_order
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      INNER JOIN event_categories ON events.id_event_category = event_categories.id
      ORDER BY events.start_date DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener todos los eventos', error: error.message });
  }
};