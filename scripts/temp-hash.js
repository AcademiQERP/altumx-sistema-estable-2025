import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'padre123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log(`Hash para '${password}': ${hash}`);
}

generateHash();