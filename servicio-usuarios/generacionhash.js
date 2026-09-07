import bcrypt from 'bcrypt';

async function run() {
  const password = '123'; // <-- aquí pones la que ya está en texto plano
  const hash = await bcrypt.hash(password, 10);
  console.log('HASH GENERADO:', hash);
}

run();
