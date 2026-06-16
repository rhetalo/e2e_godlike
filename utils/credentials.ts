/**
 * credentials.ts — генерация и персист учётных данных авто-регистрируемых тестовых
 * пользователей.
 *
 * Сохраняем в `credentials.json` с РОТАЦИЕЙ (последние MAX_RECORDS записей), чтобы файл
 * не рос бесконечно при повторных прогонах registration-flow. Формат/ротация выровнены
 * с веткой тимлида `gitlab/upd` (там тот же подход). Файл — в .gitignore (содержит креды).
 */
import fs from "fs";
import path from "path";

const CREDENTIALS_PATH = path.resolve("credentials.json");
const MAX_RECORDS = 30;

export interface UserCredentials {
  login: string;
  password: string;
  email: string;
}

export function generateCredentials(): UserCredentials {
  const login = "user_" + Math.random().toString(36).substring(2, 8);
  // Пароль фиксируется через env (воспроизводимость), иначе — случайный.
  const password =
    process.env.TEST_USER_PASSWORD ?? Math.random().toString(36).substring(2, 12);
  const email = `${login}@testmail.com`;
  return { login, password, email };
}

/** Дописывает запись в credentials.json, обрезая историю до последних MAX_RECORDS. */
export function saveCredentials(login: string, password: string, email: string): void {
  let records: UserCredentials[] = [];

  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      records = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
    } catch {
      records = [];
    }
  }

  records.push({ login, password, email });
  if (records.length > MAX_RECORDS) records = records.slice(-MAX_RECORDS);

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(records, null, 2), { encoding: "utf-8" });
}
