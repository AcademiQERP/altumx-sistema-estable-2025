import bcrypt from 'bcrypt';

async function verify() {
  try {
    const storedHash = "$2b$10$dxP4Dw6Ga.8bvkv7jnmn2.kQuAko2xFKcsZvpCQlr1DOGaf0qUQ4q";
    const plainPassword = "admin123";
    const isMatch = await bcrypt.compare(plainPassword, storedHash);
    console.log("Password:", plainPassword);
    console.log("Hash:", storedHash);
    console.log("Match:", isMatch);
  } catch (err) {
    console.error("Error:", err);
  }
}

verify();