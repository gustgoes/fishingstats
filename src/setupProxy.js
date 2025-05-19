const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api-habbo',
    createProxyMiddleware({
      target: 'https://origins.habbo.com.br',
      changeOrigin: true,
      pathRewrite: {
        '^/api-habbo': '/api',
      },
    })
  );
};
