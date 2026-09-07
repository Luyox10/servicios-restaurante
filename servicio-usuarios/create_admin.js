// src/create_admin.js
import db from './db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  try {
    const correo = 'admin@example.com';    // cambia si quieres
    const contrasenaPlain = 'AdminPass123'; // cambia la contraseña
    const nombre = 'Carlos';
    const apellido = 'Gómez';
    const telefono = '999888777';
    const cargo = 'Gerente General';
    const SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

    const hashed = await bcrypt.hash(contrasenaPlain, SALT);

    const res = await db.query(
      `INSERT INTO admins (nombre, apellido, correo, contrasena, telefono, cargo)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (correo) DO UPDATE SET contrasena = EXCLUDED.contrasena
       RETURNING id, correo`,
      [nombre, apellido, correo, hashed, telefono, cargo]
    );
    console.log('Admin creado/actualizado:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error creando admin', err);
    process.exit(1);
  }
}

main();



