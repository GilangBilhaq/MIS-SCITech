const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  const envPath = path.join(__dirname, '../../.env.local');
  let dbUrl = 'postgresql://postgres:g1lang6*@localhost:5432/db_mis';

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) dbUrl = match[1];
  }

  console.log('Connecting to PostgreSQL:', dbUrl.replace(/:[^:]*@/, ':****@'));

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('✓ Terhubung ke PostgreSQL (db_mis)!');

    const sqlPath = path.join(__dirname, 'schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Menjalankan migrasi skema tabel DDL...');
    await client.query(sqlContent);
    console.log('✓ Seluruh 10 Tabel & Indeks Multi-Tenant berhasil dibuat di database db_mis!');

    // Check table count
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tabel aktif di db_mis:');
    res.rows.forEach(r => console.log(' - ' + r.table_name));

    await client.end();
    return true;
  } catch (error) {
    console.error('Migration error:', error.message);
    return false;
  }
}

runMigration();
