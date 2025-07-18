import pool from '../database/connection.js';

// Listar eventos paginados
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
        users.username AS creator_username
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      ORDER BY events.id
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener eventos', error: error.message, stack: error.stack });
  }
};

// Búsqueda de eventos por nombre, fecha o tag
export const searchEvents = async (req, res) => {
  try {
    const { name, startdate, tag } = req.query;
    let whereStr = '';
    let params = [];
    let paramIndex = 1;

    if (name && startdate && tag) {
      whereStr = `WHERE LOWER(events.name) LIKE LOWER($1) AND events.start_date >= $2 AND events.id IN (SELECT event_tags.id_event FROM event_tags INNER JOIN tags ON event_tags.id_tag = tags.id WHERE LOWER(tags.name) = LOWER($3))`;
      params = [`%${name}%`, startdate, tag];
    } else if (name && startdate) {
      whereStr = `WHERE LOWER(events.name) LIKE LOWER($1) AND events.start_date >= $2`;
      params = [`%${name}%`, startdate];
    } else if (name && tag) {
      whereStr = `WHERE LOWER(events.name) LIKE LOWER($1) AND events.id IN (SELECT event_tags.id_event FROM event_tags INNER JOIN tags ON event_tags.id_tag = tags.id WHERE LOWER(tags.name) = LOWER($2))`;
      params = [`%${name}%`, tag];
    } else if (startdate && tag) {
      whereStr = `WHERE events.start_date >= $1 AND events.id IN (SELECT event_tags.id_event FROM event_tags INNER JOIN tags ON event_tags.id_tag = tags.id WHERE LOWER(tags.name) = LOWER($2))`;
      params = [startdate, tag];
    } else if (name) {
      whereStr = `WHERE LOWER(events.name) LIKE LOWER($1)`;
      params = [`%${name}%`];
    } else if (startdate) {
      whereStr = `WHERE events.start_date >= $1`;
      params = [startdate];
    } else if (tag) {
      whereStr = `WHERE events.id IN (SELECT event_tags.id_event FROM event_tags INNER JOIN tags ON event_tags.id_tag = tags.id WHERE LOWER(tags.name) = LOWER($1))`;
      params = [tag];
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
        users.username AS creator_username
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      ${whereStr}
      ORDER BY events.id
    `, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error en búsqueda de eventos', error });
  }
};

// Detalle de un evento
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
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
        users.username AS creator_username
      FROM events
      INNER JOIN event_locations ON events.id_event_location = event_locations.id
      INNER JOIN locations ON event_locations.id_location = locations.id
      INNER JOIN provinces ON locations.id_province = provinces.id
      INNER JOIN users ON events.id_creator_user = users.id
      WHERE events.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    // Traer tags aparte
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
    res.status(500).json({ message: 'Error al obtener el evento', error });
  }
};

// Crear evento (requiere autenticación)
export const createEvent = async (req, res) => {
  try {
    const { name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, tags } = req.body;
    const id_creator_user = req.user.id;
    if (!name || name.length < 3 || !description || description.length < 3) {
      return res.status(400).json({ message: 'El nombre o descripción están vacíos o tienen menos de tres (3) letras.' });
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
      `INSERT INTO events (name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user]
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

// Editar evento (requiere autenticación y ser creador)
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const id_creator_user = req.user.id;
    const event = await pool.query('SELECT * FROM events WHERE id = $1 AND id_creator_user = $2', [id, id_creator_user]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Evento no encontrado o no autorizado' });
    }
    const { name, description, id_event_location, max_assistance, price, duration_in_minutes, tags } = req.body;
    // Validaciones
    if (name && name.length < 3) {
      return res.status(400).json({ message: 'El nombre debe tener al menos 3 letras.' });
    }
    if (description && description.length < 3) {
      return res.status(400).json({ message: 'La descripción debe tener al menos 3 letras.' });
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
    // Armado explícito del UPDATE
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

// Desinscripción de evento
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