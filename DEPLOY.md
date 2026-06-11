# Deploying QuizWave to a Hostinger VPS (Ubuntu)

This guide assumes a fresh Ubuntu 22.04 VPS with a domain name pointed at it.

---

## 1. Connect and update the server

```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
```

---

## 2. Install Node.js 20 (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # should print v20.x.x
```

---

## 3. Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Create a database user and database
sudo -u postgres psql <<'SQL'
CREATE USER quizuser WITH PASSWORD 'StrongPasswordHere';
CREATE DATABASE quizapp OWNER quizuser;
\q
SQL
```

> **MySQL instead?** `apt install -y mysql-server`, create a user/db, and change
> `provider = "mysql"` in `server/prisma/schema.prisma`.

---

## 4. Install PM2 (process manager)

```bash
npm install -g pm2
pm2 startup systemd -u root --hp /root   # follow the printed command
```

---

## 5. Clone the repo

```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/quiz-app.git quizwave
cd quizwave
```

---

## 6. Configure environment variables

```bash
cp server/.env.example server/.env
nano server/.env
```

Fill in:
```env
DATABASE_URL="postgresql://quizuser:StrongPasswordHere@localhost:5432/quizapp"
PORT=4000
CLIENT_ORIGIN=https://yourdomain.com
JWT_SECRET=paste_a_64_char_random_string_here
NODE_ENV=production
```

Generate a strong JWT secret:
```bash
openssl rand -hex 64
```

Create the client env:
```bash
echo "VITE_API_URL=https://yourdomain.com" > client/.env
```

---

## 7. Install dependencies, migrate, seed

```bash
npm run install:all

cd server
npx prisma migrate deploy   # run all migrations
node prisma/seed.js          # optional: load sample quiz
cd ..
```

---

## 8. Build the frontend

```bash
npm run build
# Built files land in client/dist/
```

---

## 9. Start the server with PM2

```bash
pm2 start server/src/index.js --name quizwave
pm2 save
pm2 logs quizwave   # verify it started
```

---

## 10. Install and configure Nginx

```bash
apt install -y nginx
```

Create `/etc/nginx/sites-available/quizwave`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve the built React app
    root /var/www/quizwave/client/dist;
    index index.html;

    # All non-API, non-socket routes → React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy REST API calls to Express
    location /api/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Proxy Socket.IO — MUST pass the Upgrade header for WebSockets
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;   # keep long-lived WS connections alive
    }
}
```

Enable it:
```bash
ln -s /etc/nginx/sites-available/quizwave /etc/nginx/sites-enabled/
nginx -t          # should say "syntax is ok"
systemctl reload nginx
```

---

## 11. Enable HTTPS with Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow the prompts; Certbot updates the Nginx config automatically
systemctl reload nginx
```

Certbot adds a cron job to auto-renew certificates.

---

## 12. Verify everything works

1. Open `https://yourdomain.com` — you should see the QuizWave landing page.
2. Log in with `demo@quizwave.app` / `demo1234` (if you ran the seed).
3. Open a second browser tab / phone and go to `https://yourdomain.com/join`.
4. Host a game on the first tab, join from the second.

---

## Updating the app

```bash
cd /var/www/quizwave
git pull
npm run install:all
cd server && npx prisma migrate deploy && cd ..
npm run build
pm2 restart quizwave
```

---

## Useful commands

```bash
pm2 logs quizwave          # stream server logs
pm2 restart quizwave       # restart after code changes
pm2 monit                  # process monitor
sudo -u postgres psql quizapp   # connect to DB
npx prisma studio          # visual DB browser (run from server/ dir)
```
