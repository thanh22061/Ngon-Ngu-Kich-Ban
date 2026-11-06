const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const SQLCMD_PATHS = [
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\180\\Tools\\Binn\\SQLCMD.EXE',
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE',
  'sqlcmd',
];
const SQLCMD_BIN = SQLCMD_PATHS.find((p) => p === 'sqlcmd' || fs.existsSync(p)) || 'sqlcmd';
const SQL_SERVER = process.env.SQL_SERVER_INSTANCE || '.\\SQLEXPRESS';

async function main() {
  console.log(`🌱 Đang khởi tạo bảng và dữ liệu mẫu trên SQL Server (${SQL_SERVER})...`);
  const sqlFile = path.join(__dirname, '../../prisma/sportzone_sqlserver.sql');

  execFileSync(SQLCMD_BIN, ['-S', SQL_SERVER, '-E', '-C', '-f', '65001', '-i', sqlFile], {
    stdio: 'inherit',
  });

  await db.$connect();
  console.log('✅ Đã tạo Database [sportzone_db] và nạp dữ liệu mẫu thành công vào SQL Server!');
  console.log(`   - Số tài khoản (users): ${db.tables.users.length}`);
  console.log(`   - Số cụm sân (venues):  ${db.tables.venues.length}`);
  console.log(`   - Số sân con (courts):  ${db.tables.courts.length}`);
}

main().catch((err) => {
  console.error('❌ Lỗi khi seed SQL Server:', err.message);
  process.exit(1);
});
