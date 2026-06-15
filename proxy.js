const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8080;

http.createServer((req, res) => {
    // Manejar preflight OPTIONS de CORS de forma explícita
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token'
        });
        res.end();
        return;
    }

    // Obtener la URL de destino desde el parámetro "url" de la query
    const reqUrl = url.parse(req.url, true);
    const targetUrl = reqUrl.query.url;

    if (!targetUrl) {
        res.writeHead(400, { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        res.end('Falta el parametro "url" en la consulta.');
        return;
    }

    console.log(`[CORS Proxy] Redirigiendo peticion a: ${targetUrl}`);

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

    const client = parsedTarget.protocol === 'https:' ? https : http;

    const proxyReq = client.request(options, (proxyRes) => {
        // Eliminar cabeceras CORS previas del servidor de origen para evitar duplicados
        const cleanHeaders = { ...proxyRes.headers };
        for (const key of Object.keys(cleanHeaders)) {
            if (key.toLowerCase().startsWith('access-control-')) {
                delete cleanHeaders[key];
            }
        }

        // Combinar cabeceras filtradas con CORS obligatorio
        const responseHeaders = {
            ...cleanHeaders,
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
            'access-control-allow-headers': 'Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token, x-auth-token'
        };
        
        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[CORS Proxy] Error:', err);
        res.writeHead(502, { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(`Error en el proxy: ${err.message}`);
    });

    req.pipe(proxyReq);
}).listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Proxy CORS local activo en: http://localhost:${PORT}/?url=`);
    console.log(`Usa esta URL en el campo 'CORS Proxy URL' del modal.`);
    console.log(`====================================================`);
});
