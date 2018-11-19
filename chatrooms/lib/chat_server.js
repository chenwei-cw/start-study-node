/*
 * @Author: chenwei 
 * @Date: 2018-11-19 14:39:40 
 * @Last Modified by: chenwei
 * @Last Modified time: 2018-11-19 16:40:46
 */
const socketio = require('socket.io');
let io,
    guestNumber = 1,
    nickNames = {},
    namesUseds = [],
    currentRoom = {};

exports.listen = function(server){
    //启动SocketIO服务器，允许它搭载在已有的HTTP服务器上
    io = socketio.listen(server);
    io .set('log level',1);
    //定义每个用户连接处理的逻辑
    io.sockets.on('connection',function(socket){
        //在用户连接上来时，赋予其一个访客名
        guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUseds);
        //在用户连接上时把他放入聊天室lobby里
        joinRoom(socket,'Lobby');
        //处理用户的消息，更名，以及聊天室的创建和变更
        handleMessageBroadcasting(socket,nickNames);
        handleNameChangeAttempts(socket,nickNames,namesUseds);
        handleRoomJoining(socket);
        //用户发出请求时，向其提供已经被占用的聊天室的列表
        socket.on('rooms',function(){
            socket.emit('rooms',io.sockets.manager.rooms);
        });
        //定义用户断开后的清除逻辑
        handleClientDisconnection(socket,nickNames,namesUseds);

    });
};

/**分配用户昵称 */
function assignGuestName(socket,guestNumber,nickNames,namesUseds){
    let name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    //让用户知道自己的昵称
    socket.emit('nameResult',{
        success:true,
        name:name
    });
    namesUseds.push(name);
    return guestNumber + 1;
};
/**进入聊天室 */
function joinRoom(socket,room){
    //让用户进入房间
    socket.join(room);
    //记录房间
    currentRoom[socket.id] = room;
    //让用户知道他们进入新的房间
    socket.emit('joinResult',{room:room});
    //让房间里的其他用户知道有新用户进入了房间
    socket.broadcast.to(room).emit('message',{
        text:nickNames[socket.id] + 'has joined' + room + '.'
    });
    //确定房间里有哪些用户在这个房间
    let usersInRoom = io.socket.clients(room);
    //如果不止一个用户在这个房间，汇总下都是谁
    if(usersInRoom.length > 1){
        let usersInRoomSummary = 'Users currently in ' + room + ': ';
        for(let index in usersInRoom){
            let userSocketId = usersInRoom[index].id;
            if(userSocketId !=socket.id){
                if(index > 0){
                    usersInRoomSummary +=',';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        //将房间里其他用户的汇总发送给这个用户
        socket.emit('message',{text:usersInRoomSummary});
    }
}
/**更改昵称 */
function handleNameChangeAttempts(socket,nickNames,namesUseds){
    //添加nameAttempt监听事件
    socket.on('nameAttempt',function(name){
        //昵称不能以Guest开头
        if(name.indexOf('Guest') == 0){
            socket.emit('nameResult',{
                success:false,
                message:'Names cannot begin with "Guest".'
            });
        }else{
            //如果昵称还没有人注册，就注册
            if(namesUseds.indexOf(name) == -1){
                let previousName = nickNames[socket.id],
                    previousNameIndex = namesUseds.indexOf(previousName);
                namesUseds.push(name);
                nickNames[socket.id] = name;
                //删掉原先的昵称
                delete namesUseds[previousNameIndex];
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id].emit('message',{
                    text:previousName + ' is now known as ' + name + '.'
                }));
            }else{
                //昵称已经有人使用，给客户端发送错误消息
                socket.emit('nameResult',{
                    success:false,
                    message:'That name is already in uset.'
                });
            }
        }
    });
}