// =========================================================
//  PM2 - gerenciador de processos (Linux/VPS)
//  Uso:  pm2 start ecosystem.config.cjs
//       pm2 save && pm2 startup
// =========================================================
module.exports = {
  apps: [
    {
      name: "videochamada-web",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "./logs/erro.log",
      out_file: "./logs/saida.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
