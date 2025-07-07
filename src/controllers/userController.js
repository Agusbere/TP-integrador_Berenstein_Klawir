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
