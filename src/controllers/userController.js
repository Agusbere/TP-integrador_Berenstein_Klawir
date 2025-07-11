import pool from '../database/connection.js';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT id, first_name, last_name, username FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, first_name, last_name, username FROM users');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
};

// Actualizar usuario (ejemplo de endpoint CRUD explícito)
export const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, password } = req.body;
    let updateFields = [];
    let updateParams = [];
    let paramIdx = 1;
    if (first_name) {
      updateFields.push(`first_name = $${paramIdx++}`);
      updateParams.push(first_name);
    }
    if (last_name) {
      updateFields.push(`last_name = $${paramIdx++}`);
      updateParams.push(last_name);
    }
    if (password) {
      updateFields.push(`password = $${paramIdx++}`);
      updateParams.push(password);
    }
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar.' });
    }
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`;
    updateParams.push(userId);
    await pool.query(updateQuery, updateParams);
    res.status(200).json({ message: 'Usuario actualizado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error });
  }
};

// Eliminar usuario (ejemplo de endpoint CRUD explícito)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
};
