var email_user_hset = {
	set_name : "email-user"
};

var user_schema = {
	password : 0,
	email : 1
};	

module.exports.add_user = function( redis, user_name, user_password, user_email, callback) {
	/* 
		It will create a new user in the system. 
	*/
	redis.rpush( user_name, user_password , user_email ,0,0,"0:0:0",0, function (err, status){
		if( !err ){
			redis.hset(email_user_hset.set_name, user_email, user_name,function (err, result){
				if( !err ){
					/* IF no error occurs returning status to calling environment*/
					callback( null, 1);
				}
				else{
					/*
				Some Error occur possibly no db connectivity anymore
					*/
					console.log("ERR AT add_user inside user_module");
				}
			});	
		}else{
			/*
				Some Error occur possibly no db connectivity anymore
			*/
			console.log("ERR AT add_user inside user_module");
			callback( 1, null);
		}
	});
}

module.exports.change_password = function (redis, user, pass, newpass, callback){
	redis.lindex(user , user_schema.password, function (err, passwd){
		if(err){
			/*
				Some Error occur possibly no db connectivity anymore
			*/
			console.log('ERR AT user_model.js AT change_password');
			callback( 1, null);
		}
		else{
			if(pass == passwd){
				redis.lset(user,0,newpass);
				callback( null, true);
			}
			else callback( null, false);
		}
	});
}

module.exports.check_user_name_exists = function(redis,  user_name, callback){
	/* 
		It will check if the user name already
		exists or not
	*/
	redis.exists(user_name, function ( err, status){
		if( !err ){
			/* IF no error occurs returning status to calling environment*/
			callback( null, status);
		}else{
			/*
				Some Error occur possibly no db connectivity anymore
			*/
			console.log('ERR AT user_model.js AT check_user_name_exists');
			callback( 1, null);
		}	
	});
}

module.exports.check_user_email_exists = function( redis, user_email, callback){
	/* 
		It will check if the email address 
		already in use or not!
	*/
	redis.hexists( email_user_hset.set_name , user_email, function ( err, status){
		if( !err ){
			/* IF no error occurs returning status to calling environment*/
			callback( null, status);
		}else{
			/*
				Some Error occur possibly no db connectivity anymore
			*/
			console.log('ERR AT user_model.js AT check_user_email_exists');
			callback( 1, null);
		}	
	});	
}

module.exports.validate_user = function( redis, user_name, user_password, callback){
	redis.lindex(user_name, user_schema.password,function ( err, pass){
		if( !err ){
			if( pass == user_password ){
				callback( null, true);		
			}else{
				callback( null, false);
			}
		}else{
			console.log("ERR AT validate_user inside user_model.js");
			callback( 1, null);
		}
	});
}