/*
 * @Author: chenwei 
 * @Date: 2018-11-19 10:56:37 
 * @Last Modified by: chenwei
 * @Last Modified time: 2018-11-20 15:17:36
 */

const http = require('http'),
      fs = require('fs'),
      path = require('path'),
      mime = require('mime');
let cache = {};                 //缓存文件内容的对象

const chatServer = require('./lib/chat_server');

/**创建http服务器 */
const server = http.createServer(function(request,response){
    let filePath = false;
    if(request.url == '/'){
        filePath = 'public/index.html';
    }else{
        filePath = 'public' + request.url;
    }
    let absPath = './' + filePath;
    //返回静态文件
    serveStatic(response,cache,absPath);
});

/**启动Socket.IO，跟http服务器共用一个TCP/IP端口 */
chatServer.listen(server);

/**提供静态文件服务 */
function serveStatic(response,cache,absPath){
    if(cache[absPath]){
        sendFile(response,absPath,cache[absPath]);
    }else{
        fs.exists(absPath,function(exists){
            if(exists){
                fs.readFile(absPath,function(err,data){
                    if(err){
                        send404(response)
                    }else{
                        cache[absPath] = data;
                        sendFile(response,absPath,data);
                    }
                })
            }else{
                send404(response)
            }
        })
    }
}

/**文件不存在，发送404 */
function send404(response){
    response.writeHead(404,{'Content-Type':'text/plain'});
    response.write('Error 404:resource not found');
    response.end();
}
/**发送文件 */
function sendFile(response,filePath,fileContents){
    response.writeHead(200,{
        "content-type":mime.lookup(path.basename(filePath))
    });
    response.end(fileContents);
}

server.listen(3000,function(){
    console.log("Server listening on port 3000");
});