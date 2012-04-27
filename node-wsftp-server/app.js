// Help got from: http://www.danielbaulig.de/socket-ioexpress/
var io = require('socket.io')
  , express = require('express')
  , util = require('util')
  , app = express.createServer()
  , connect = require('express/node_modules/connect')
  , parseCookie = connect.utils.parseCookie
  , MemoryStore = connect.middleware.session.MemoryStore
  , store;
var fs = require('fs');
var Buffer = require('buffer').Buffer;
var constants = require('constants');
var walk    = require('walk');
var PACKET_SIZE = 8 * 1024; // 4 KB

function getContents(path, callback){
    fs.readdir(path, function(err,files){
        var meta_files = [];
        for ( var i = 0; i < files.length; i++){
            var stats = fs.statSync(path + "/" + files[i]);
            meta_files.push({ 
                type: stats.isFile() ? "file" : stats.isDirectory() ? "directory" : "unknown",
                name: path + "/" + files[i],
                length: stats.size
            }); 
        }
        meta_files = meta_files.sort(function(a,b){
            if ( a.type == b.type)
                return 0;
            if ( a.type == "directory" && b.type == "file")
                return 1;
            return -1;
        });
        callback(meta_files);        
    });
}

app.configure(function () {
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.set('view engine', 'jade');
    app.set('view options', {layout: true});
    app.use(express.cookieParser());
    app.use(express.session({
      secret: 'secret'
    , key: 'express.sid'
    , store: store = new MemoryStore()
    }));
});

app.get('/', function (req, res) {
    if ( req.connection.remoteAddress == "127.0.0.1"){
        res.render('index', {value: req.session.value});
    } else {
        res.send("not allowed");
    }
});
app.listen(3000);
var sio = io.listen(app);

sio.set('log level', 0);
sio.sockets.on('connection', function (socket) {
    socket.emit("hello", "naber");

    socket.on("files", function(msg){
        console.log(msg);
        var path = msg.path;
        getContents(path, function(files){
            socket.emit("server_file_list", files);
        });
    });

    socket.on("getfile", function(msg){
        getFile(msg.path, msg.offset, socket);
    });
});


var fds = new Array();
function getFD(path, callback){
    fs.open(path, 'r', function(status, fd) {
        if (status) {
            console.log(status.message);
            return;
        }
        fds[path] = fd;
        callback(fd);
    });
}

function getFile(path, offset, socket){
    getFD(path, function(fd){
        // console.log(fd);
        var size = fs.statSync(path).size;
        // console.log(path + " => " + offset + "/" + size);
        var buffer = new Buffer(PACKET_SIZE);
        fs.read(fd, buffer, 0, PACKET_SIZE , offset, function(err, num) {
            if ( err){
                throw err;
            }
            socket.emit("filecontent", {
                filename: path,
                content:buffer.slice(0,num),
                length:num,
                offset: offset
            });
            fs.close(fd);
        });        
    });
}
