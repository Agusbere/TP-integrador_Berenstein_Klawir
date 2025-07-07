import pool from '../database/connection.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = '@TPintegrador_10';

export const register = async (req, res) => {
    const { first_name, last_name, username, password } = req.body;

    if (!first_name || !last_name || !username || !password) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (first_name.length < 3 || last_name.length < 3 || username.length < 3 || password.length < 3) {
        return res.status(400).json({ message: 'Todos los campos deben tener al menos 3 caracteres' });
    }

    try {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'El usuario ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4) RETURNING id, first_name, last_name, username`,
            [first_name, last_name, username, hashedPassword]
        );

        res.status(201).json({ message: 'Usuario registrado correctamente', user: result.rows[0] });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}; 