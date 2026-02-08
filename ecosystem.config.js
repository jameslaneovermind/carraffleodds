/**
 * PM2 Ecosystem Config — CarRaffleOdds Scraper Service
 *
 * Usage:
 *   pm2 start ecosystem.config.js     # start the scraper service
 *   pm2 logs scraper                   # view logs
 *   pm2 restart scraper                # restart
 *   pm2 stop scraper                   # stop
 *   pm2 monit                          # live monitoring dashboard
 *   pm2 startup                        # enable auto-start on reboot
 *   pm2 save                           # save current process list for reboot
 */
module.exports = {
  apps: [
    {
      name: 'scraper',
      script: 'npx',
      args: 'tsx scripts/scraper-service.ts',
      cwd: '/opt/carraffleodds',
      interpreter: 'none',

      // Environment
      env_file: '/opt/carraffleodds/.env',

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',           // consider "started" after 30s
      restart_delay: 5000,          // 5s between restarts
      exp_backoff_restart_delay: 100, // exponential backoff on repeated crashes

      // Memory — kill and restart if it exceeds 1.5GB (leaves headroom on 2GB droplet)
      max_memory_restart: '1500M',

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/opt/carraffleodds/logs/scraper-error.log',
      out_file: '/opt/carraffleodds/logs/scraper-out.log',
      merge_logs: true,
      log_type: 'json',

      // Rotate logs (requires pm2-logrotate: pm2 install pm2-logrotate)
      // Configured separately via: pm2 set pm2-logrotate:max_size 50M
      //                            pm2 set pm2-logrotate:retain 7

      // Watch (disabled — we deploy manually via git pull)
      watch: false,
    },
  ],
};
