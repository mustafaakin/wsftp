$(document).ready(function(){
	window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
	var socket; 
	var blobs = new Array();
	var toDownload = 0;
	var filename; 
	var startTime; 
	var blockSize =  8 * 1024;

	function showMessage(msg){
		$("#console").append("<br/>" + msg);
	}
	
	$("#btn-getfiles").click( function(){
		var place = $("#SRV_PLACE").val();
		socket.emit('files', {path:place});
	});
	
	var queue = [];
	$(".btn-download").live("click", function(){
		var fname = $(this).text();
		var size = $(this).data("length");
		startTime = new Date();

		for ( var i = 0; i < size; i = i + blockSize) {
			toDownload++;
			queue.push({path:fname, offset: i});			
		}
		var task = queue.pop();
		console.log(task);
		socket.emit("getfile", task);
	});


	$("#btn-connect").click( function(){
		var ip = $("#SRV_IP").val();
		var port = $("#SRV_PORT").val();
		socket = io.connect("http://" + ip + ":" + port);
		showMessage("Connected to " + ip);
		socket.on('server_file_list', function (data){
			var gui = "<ul>";
			for ( var i = 0; i < data.length; i++){
				gui += "<li><a class='btn btn-download' data-length='" + data[i].length + "'>" + data[i].name + "</a></li>";
			}
			$("#filelist").html(gui + "</ul>");
		});

		socket.on('filecontent', function (data) {
	   		// showMessage("Recieved Data at size: " + data.length);
	   		
	   		function makeBlobFromData(data){
	   			blob = new window.WebKitBlobBuilder();
	   			bytes = new Uint8Array(data.length);	   		
	   			for ( var i = 0; i < data.length; i++){
		   			bytes[i] = data.content[i];
		   		}
		   		blob.append(bytes.buffer);
		   		return blob;
			}


	   		blobs[Math.ceil(data.offset / blockSize)] = makeBlobFromData(data);
	   		var a = data.filename.split("/");	   		
	   		filename = a[a.length - 1];
	   		toDownload--;
	   		// showMessage("Remaining downloads: " + toDownload);
	   		if ( toDownload == 0){
	   			var sampled = new WebKitBlobBuilder();
	   			for ( var i = 0; i < blobs.length; i++){
	   				sampled.append(blobs[i].getBlob());
	   			}
	   			createFile(filename, sampled, function(){
	   				var time = new Date() - startTime;
	   				showMessage("Took: " + (time) + " ms");
	   			});
	   			showMessage("Downloads finished");
	   		}
	   		for ( var i = 0; i < 2; i++){
		   		var task = queue.pop();
				if ( task){
					socket.emit("getfile", task);	   		
				}
			}
	  	});
	});
	
	// FILE OPERATIONS //
	function createFile(fileName, blob, callback){
		window.requestFileSystem(window.PERSISTENT, 5 * 1024 *1024 *1024, function(fs) {
		  fs.root.getFile(fileName, {create: true}, function(fileEntry) {
			fileEntry.createWriter(function(fileWriter) {
			  fileWriter.onwriteend = function(e) {
				showMessage('Write completed: <a href="' + fileEntry.toURL() + '">Download</a>');
				if ( callback) callback();
			  };
			  fileWriter.onerror = function(e) {
				console.log(e);
				if ( callback)
					callback();
			  };
			  fileWriter.write(blob.getBlob());
			}, errorHandler);
		  }, errorHandler);
	  }, errorHandler)	  		
	}
	
	function removeFile(fileName, callback){
		window.requestFileSystem(window.PERSISTENT, 5 * 1024 *1024 *1024, function(fs) {
		  fs.root.getFile(fileName, {create: true}, function(fileEntry) {		
			fileEntry.remove(function() {
			  console.log('File removed.');
			  if ( callback)
				  callback();
			}, errorHandler);		
		  }, errorHandler);
		}, errorHandler);
	}
	
	function appendFile(fileName, data, callback){
		window.requestFileSystem(window.PERSISTENT, 5* 1024 * 1024 * 1024, function(fs){
			fs.root.getFile(fileName, {create: true, exclusive: false}, function(fileEntry) {
			fileEntry.createWriter(function(fileWriter) {
			  fileWriter.seek(fileWriter.length); // Go to EOF
			  var tmpBB = new window.WebKitBlobBuilder();
			  tmpBB.append(data);
			  fileWriter.write(tmpBB.getBlob());
			  fileWriter.onwriteend = function(e){
				  offset++;
				  callback();
			  };			  
			}, errorHandler);
		  }, errorHandler);			
		}, errorHandler);				
	}
	
	function fileRead(fileName, callback){
		window.requestFileSystem(window.PERSISTENT, 5* 1024 * 1024 * 1024, function(fs){
		  fs.root.getFile(fileName, {}, function(fileEntry) {
			fileEntry.file(function(file) {
			   var reader = new FileReader();
			   reader.onloadend = function(e) {
					callback(this.result);
			   };
			   reader.readAsArrayBuffer(file);
			}, errorHandler);
		  }, errorHandler);
		}, errorHandler);
	}
	
	function errorHandler(e) {
	  var msg = '';	
	  switch (e.code) {
		case FileError.QUOTA_EXCEEDED_ERR:
		  msg = 'QUOTA_EXCEEDED_ERR';
		  break;
		case FileError.NOT_FOUND_ERR:
		  msg = 'NOT_FOUND_ERR';
		  break;
		case FileError.SECURITY_ERR:
		  msg = 'SECURITY_ERR';
		  break;
		case FileError.INVALID_MODIFICATION_ERR:
		  msg = 'INVALID_MODIFICATION_ERR';
		  break;
		case FileError.INVALID_STATE_ERR:
		  msg = 'INVALID_STATE_ERR';
		  break;
		default:
		  msg = 'Unknown Error';
		  break;
	  };
	  console.log('Error: ' + msg);
	}	
});