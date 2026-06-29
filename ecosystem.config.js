module.exports = {
  apps: [
    {
      name: 'life-os',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ubuntu/life-os',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
