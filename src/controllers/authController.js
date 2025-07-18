import pool from '../database/connection.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = '@TPintegrador_10';

export const register = async (req, res) => {
    const { first_name, last_name, username, password } = req.body;

    if (!first_name || !last_name || !username || !password) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.', token: '' });
    }
    if (first_name.length < 3 || last_name.length < 3) {
        return res.status(400).json({ success: false, message: 'first_name o last_name vacíos o menos de 3 letras.', token: '' });
    }
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(username)) {
        return res.status(400).json({ success: false, message: 'El email es inválido.', token: '' });
    }
    if (password.length < 3) {
        return res.status(400).json({ success: false, message: 'El password está vacío o tiene menos de 3 letras.', token: '' });
    }
    try {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'El usuario ya está registrado.', token: '' });
        }
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4) RETURNING id, first_name, last_name, username`,
            [first_name, last_name, username, password]
        );
        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );
        res.status(201).json({ success: true, message: 'Usuario registrado correctamente', user, token });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message, error: err, token: '' });
    }
};

export const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios.', token: '' });
    }
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(username)) {
        return res.status(400).json({ success: false, message: 'El email es inválido.', token: '' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, message: 'Usuario o clave inválida.', token: '' });
        }
        if (password !== user.password) {
            return res.status(401).json({ success: false, message: 'Usuario o clave inválida.', token: '' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );
        res.status(200).json({ success: true, message: 'Login exitoso', token });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno del servidor', token: '' });
    }
};

export const verifyToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query('SELECT id, first_name, last_name, username FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        res.status(200).json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
}; 