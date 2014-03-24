var User = require('../models/user_model');
var Quiz = require('../models/quiz_model');
var sockuser = [];
module.exports = function ( io, redis) {
	
	io.sockets.on('connection',function (socket){

		socket.on('store_me',function (user,Qid){
			sockuser.push(socket);
			sockuser.push(user);
			sockuser.push(Qid);
		});
		
		socket.on('new_user',function (name,pass,email){
			/*
				Event trigger when user signup happens
				It will add user to the db and populate its feilds 
				by name , email, and password
			*/
	        User.add_user( redis, name, pass, email, function ( err, result){
	        	if( !err ){
	        		/*
						If no error occurs then this event 
						will put user to the next page by 
						form submitting.
	        		*/
	        		socket.emit('forward');
	        	}else{
	        		/*
						something wrong happens may be because
						of the db is in down state or missing feilds.
	        		*/
	        		console.log('ERR at newuser in sockets.js');
	        	}
	        });
	    });

	    socket.on('check',function (user_name){
	    	/*
				Event trigger in order to check the
				existance of the user_name in DB 
	    	*/
	    	User.check_user_name_exists( redis, user_name , function( err, status){
	    		if( ! err ){
	    			/* 
	    				No error happens
						------------------------------------
						|	if the status == 1:            |
						|		user already exists        |
						|	else:                          |
						|		user name is available     |
						------------------------------------
	    			*/
	    			if( status ){
	    				/* event to warn existance of user_name*/
	    				socket.emit("tell");
	    			}
	    		}else{
	    			console.log(" ERR AT sockets.js IN check");
	    		}
	    	});
		});

	    socket.on('check_email',function (user_email){
	    	/*
				Event trigger in order to check the
				existance of the user_name in DB 
	    	*/
	    	User.check_user_email_exists( redis, user_email, function( err, status){
	    		if( ! err ){
	    			/* 
	    				No error happens
						---------------------------------------------
						|	if the status == 1:            			|
						|		email address already exists        |
						|	else:                          			|
						|		email address is available     		|
						---------------------------------------------
	    			*/	
	    			if( status ){
	    				/* event to warn existance of email_address */
	    				socket.emit("tell_email");
	    			}
	    		}else{
	    			console.log(" ERR AT sockets.js IN check");
	    		}
	    	});
	    });

		socket.on('no_fault',function(user){
			sockuser.splice(sockuser.indexOf(socket),2);
		});

	    socket.on('did',function ( user, Qid){
	    	Quiz.get_quiz_detail_generic( redis, Qid, 9, -1, function (err, data){
	    		if( !err ){
	    			Quiz.edit_log_detail( redis, user, Qid, 0, parseInt(data[0])-1);
	    			Quiz.edit_log_detail( redis, user, Qid, 1, parseInt(data[parseInt(data[0])-1]));	
	    			socket.emit('end');
	    		}else{

	    		}
	    	});
	    });
	    
	    socket.on('verify_pass',function ( user, pass, newpass){
			User.change_password( redis, user, pass, newpass, function ( err, status){
				if( !err ){
					if( status ){
						socket.emit("change");
					}else{
						socket.emit("err");
					}
				}
			});
		});

		socket.on('disconnect',function(){
			var z = sockuser.indexOf(socket);
			if( z != -1){
				var user =sockuser[z+1];
				var Qid = sockuser[z+2];
				Quiz.edit_log_detail( redis, user, Qid, log_schema.duration, time);
				sockuser.splice(z,3);
			}
		});

	});

} 