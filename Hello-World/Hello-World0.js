var http = require('http');
var server = http.createServer();

server.on('request',function(request,responese){
    responese.writeHead(200,{'Content-Tyope':'text/plain'})
    responese.end('Hello World!\n');
});

server.listen(3000);

console.log('Server running at http://localhost:3000/')