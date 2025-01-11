import createProxyMiddleware from 'http-proxy-middleware';

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'https://api.rajaongkir.com',
            changeOrigin: true,
            pathRewrite: {
                '^/api': '',
            },
        })
    );
};