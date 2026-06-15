const https = require('https');
const url = require('url');

module.exports = (req, res) => {
    // Habilitar cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token, x-auth-token');

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Obtener la URL de destino desde el parámetro "url" de la query
    const targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(400).send('Falta el parametro "url" en la consulta.');
        return;
    }

    const parsedTarget = url.parse(targetUrl);
    
    // Copiar cabeceras de la petición entrante (excluyendo el host de origen)
    const headers = { ...req.headers };
    delete headers.host;
    
    const options = {
        hostname: parsedTarget.hostname,
        port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
        path: parsedTarget.path,
        method: req.method,
        headers: headers
    };

    const proxyReq = https.request(options, (proxyRes) => {
        // Copiar las cabeceras originales del servidor excluyendo las de CORS
        for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (!key.toLowerCase().startsWith('access-control-')) {
                res.setHeader(key, value);
            }
        }
        res.status(proxyRes.statusCode);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[CORS Proxy Serverless] Error:', err);
        res.status(502).send(`Error en el proxy: ${err.message}`);
    });

    req.pipe(proxyReq);
};
