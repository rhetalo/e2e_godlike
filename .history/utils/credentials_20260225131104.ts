import fs from 'fs';
import path from 'path';

export function generateCredentials() {
    const login =
    'user_' + Math.random().toString(36).substring(2, 8);
    const password =
    Math.random().toString(36).substring(2, 12);
    const email = `${login}@testmail.com`;

    return { login, password, email };
}

export function saveCredentials(
    login: string,
    password: string,
    email: string
) {
    const filePath = path.resolve('credentials.csv');
    const exists = fs.existsSync(filePath);

    const header = 'login,password,email\n';
    const row = `${login},${password},${email}\n`;

    if (!exists) {
    fs.writeFileSync(filePath, header + row, { encoding: 'utf-8' });
    } else {
    fs.appendFileSync(filePath, row, { encoding: 'utf-8' });
    }
}