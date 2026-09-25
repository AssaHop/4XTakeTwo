// scripts/balance/lib/csv.mjs — минимальный append-only CSV writer, без зависимостей.
//
// Синхронная запись через файловый дескриптор (не WriteStream) — раньше
// использовался createWriteStream, у которого при фоновом запуске через
// Bash run_in_background строки годами не показывались на диске (заметно
// на первом полном прогоне эксперимента B — процесс реально писал строки,
// счётчик партий рос, а CSV-файла не было вообще). Причина не выяснена до
// конца (похоже на буферизацию стрима, которая не долетала до диска в
// фоновом процессе), синхронный fd надёжнее и достаточно быстр для тысяч
// строк за прогон.
import { openSync, writeSync, closeSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

function escapeField(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function createCsvWriter(filePath, columns) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const fd = openSync(filePath, 'w');
  writeSync(fd, columns.join(',') + '\n');

  return {
    writeRow(row) {
      writeSync(fd, columns.map(c => escapeField(row[c])).join(',') + '\n');
    },
    close() {
      closeSync(fd);
      return Promise.resolve();
    },
  };
}
