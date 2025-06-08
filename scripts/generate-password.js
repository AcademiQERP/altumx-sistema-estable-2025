import bcrypt from 'bcrypt';

async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(`Password: ${password}`);
  console.log(`Hashed: ${hash}`);
  return hash;
}

// Crear un hash para la contraseña "admin123"
hashPassword("admin123");