module.exports = {
    apps: [{
      name: 'nestjs-alfa',
      args: 'start',
      script: 'dist/src/main.js', // Path to your built main file
      cwd: '/var/www/backend-testimoni',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }]
  };