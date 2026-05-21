require('dotenv').config();
const http = require('http');

function request(method, path, body, cookie, port = 3000) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: cookie ? { Cookie: cookie } : {},
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          location: res.headers.location,
          body: data,
          cookie: res.headers['set-cookie'],
        })
      );
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(username, password, port) {
  const res = await request('POST', '/auth/login', `username=${username}&password=${password}`, null, port);
  return (res.cookie || []).map((c) => c.split(';')[0]).join('; ');
}

async function followGet(path, cookie, port) {
  let res = await request('GET', path, null, cookie, port);
  let hops = 0;
  while (res.status >= 300 && res.status < 400 && res.location && hops < 5) {
    const next = res.location.startsWith('http')
      ? new URL(res.location).pathname
      : res.location;
    res = await request('GET', next, null, cookie, port);
    hops++;
  }
  return res;
}

(async () => {
  const port = process.env.PORT || 3000;
  try {
    const cookieAdmin = await login('admin', '123456', port);
    const cookieSup = await login('supervisor', '123456', port);

    const tests = [
      ['admin', '/clientes', cookieAdmin, true],
      ['admin', '/usuarios', cookieAdmin, true],
      ['supervisor', '/usuarios', cookieSup, true],
      ['supervisor', '/clientes', cookieSup, false],
      ['supervisor', '/productos', cookieSup, false],
    ];

    for (const [user, path, cookie, esperado] of tests) {
      const res = await followGet(path, cookie, port);
      const ok =
        esperado
          ? res.status === 200 && !res.body.includes('No tiene permiso')
          : res.status === 302 || res.body.includes('dashboard') || res.body.includes('permiso');
      console.log(
        user,
        path,
        'esperado',
        esperado ? 'OK' : 'DENEGADO',
        '->',
        res.status,
        ok ? 'PASS' : 'FAIL'
      );
    }
  } catch (e) {
    console.error('Error (¿servidor en marcha?):', e.message);
    process.exitCode = 1;
  }
})();
