// http 모듈을 import합니다.
const http = require('http');
const url = require('url');

// 서버를 생성합니다.
const server = http.createServer((req, res) => {
  // 요청 메소드가 GET인지 확인합니다.
  if (req.method === 'GET') {
    const reqUrl = url.parse(req.url, true);

    // GET 요청의 경우, 요청 URL을 확인합니다.
    if (reqUrl.pathname == '/sample') {
      const name = reqUrl.query.name; // URL에서 name 파라미터를 얻습니다.
      
      // HTTP 상태 코드 200과 함께 응답합니다.
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(`<h1>Hello ${name}!</h1>`);
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  }
});

// 서버가 3000번 포트에서 리스닝하게 합니다.
server.listen(9000);