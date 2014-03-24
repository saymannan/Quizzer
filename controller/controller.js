//console.log("ERR AT INSIDE");

/*
	This is the main controller which handles all 
	the routes and direct request and response to
	respected handler and interacts with models in
	order to perform any database related operations. 
	
	Method call by app.js having express object
   	And redis client.

	NOTE:
		It follows Post Redirect Get i.e. PRG format
		Read it for further information.
*/

/* Dependencies from other Modules */

var User = require("../models/user_model");
var Quiz = require("../models/quiz_model");
var Redis = require("../models/redis_model");

var count = 0;
/* some frequently used variables */


var log_schema = {
	set_name : "log:",
	section_count : 0,
	question_count : 1,
	disconnect_count : 3,
	duration : 2
}

var proof_schema = {
	set_name : "complete:"
};

var question_schema = {
	section_data_padding : 8,
	question_padding : 11,
	statement : 0,
	img : 1,
	pos : 2,
	neg : 3,
	opt1 : 4,
	opt2 : 5,
	opt3 : 6,
	opt4 : 7,
	answer : 8,
	extra1 : 9,
	extra : 10 
};

var quizcount = {
	set_name : "QuizValue"
};

var quiz_creation_backup_schema = {
	set_name : "Saved:",
	current_section : 0,
	current_question : 1
};

var quiz_schema = {
	set_name : "Quiz:",
	quiz_creator : 0,
	section_count : 9
};


var range_limit = {
	lower_limit : 0,
	upper_limit : -1
};

var section_schema = {
	set_name : "Section:",
	rank : 0,
	section_name : 1,
	rules_blog : 2,
	total_questions : 3,
	section_cutoff : 4,section_duration : 5
};



module.exports = function( app, redis){

	/* GET request block */
//======================================================================================================
	
	app.get('/', function (req, res){
		/* 
			primitive request that initiates the process 
			emmited when user hit the URL. it is the entry point.	
		*/

		//debug log to get port number where request is entertained
		console.log(count++);
		
		//front page rendering containing 
		res.render('front.ejs',{title2:""});
	});

	app.get('/add-question', is_logged_in,function (req, res){
		
		res.render('addquestion.ejs',{ title:req.session.userId, QID : req.session.Q});
	});

	app.get('/change_role', is_logged_in, function (req, res){
		if( req.session.role == "creator"){
			req.session.role = "participant";
			res.redirect('/home_participant');
		}else{
			req.session.role = "creator";
			res.redirect('/home_creator');
		}
	});

	app.get('/cpasswd',function (req,res){
		res.render('cpasswd.ejs', { user : req.session.userId});
	});

	app.get('/create', is_logged_in, function (req, res){
		/*
			This will show the quiz detail  
			filling form. 
		*/
		res.render('predetailofquiz.ejs', {title : req.session.userId});
	});

	app.get('/edit-complete', is_logged_in, function (req, res) {
		var user = req.session.userId;
		Quiz.user_incomplete_quiz( redis, user, function (err, arr){
			if ( !err ){
				res.render("quizList.ejs", { title : user, list : arr});		
			}else{
				console.log("ERR AT /edit-complete INSIDE controller.js");
			}
		});
	});

	app.get('/edit-edit', is_logged_in, function (req, res){
		var user = req.session.userId;
		Quiz.get_user_quiz_list(redis , user, function (err, arr){
			if(err){
				console.log("ERR AT edit-edit INSIDE controller.js");
				res.redirect('/');
			}else{
				res.render("user_quiz_list",{ title:user, list:arr});
			}	
		});
	});

	app.get('/edit-pre-quizdetail', is_logged_in,function (req,res){
		var Qid = req.session.Q; 
		Quiz.get_quiz_detail( redis, Qid, function ( err, Qd){
			if( !err ){
				res.render('edit-prequiz-detail.ejs',{ title:req.session.userId, Qid:Qid, Qd:Qd.slice(1) });
			}else{
				console.log("ERR AT edit-prequiz-detail INSIDE controller.js");
				res.redirect('/');
			}
		});
	});

	app.get('/edit-question', is_logged_in,function (req, res){
		var Qid = req.session.Q;
		var Sid = req.cookies.Sid;
		var editQ = (parseInt(req.param('editQ')) - 1) * 11 + 8;
		res.cookie('Eq',editQ);
		Quiz.get_section_detail( redis, Qid, Sid, editQ, editQ+10,function (err, Qdata){
			if(err){
				console.log("ERR AT edit-question INSIDE controller.js");
				res.redirect('/');
			}else{
				res.render('edit-question.ejs',{ title:req.session.userId, QID : req.session.Q, Qd:Qdata});		
			}
		});
	});

	app.get('/edit-section-detail', is_logged_in,function (req, res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var rmc = req.param('id');
		Quiz.get_section_detail(redis, Qid, rmc,0,5,function (err,Sec){
			if(err){
				console.log("ERR AT /edit-section-detail INSIDE controller.js");
				res.redirect('/');
			}
			else{
				console.log('aaaaaaa');
				var timemill = parseInt(Sec[5]);
				var DD = parseInt(timemill/(86400000));
				timemill = timemill%86400000;
				var HH = parseInt(timemill/(3600000));
				timemill = timemill%3600000;
				var MM = parseInt(timemill/(60000));
				req.session.S = rmc;
				res.render('edit-sectiondetail.ejs',{title:user,QID:Qid,Sd:Sec,DD:DD,HH:HH,MM:MM});		
			}
		}); 
	});

	app.get('/home', is_logged_in, function (req, res){
		if( req.session.role == "creator"){
			res.redirect('/home_creator');
		}else{
			res.redirect('/home_participant');
		}
	});

	app.get('/home_creator', is_logged_in ,function (req, res){
		/*
			This will show the home page 
			to the creator. 
		*/
		res.render('select-creator.ejs',{ title : req.session.userId});
	});

	app.get('/home_participant', is_logged_in ,function (req, res){
		/*
			This will show the home page 
			to the participant. 
		*/
		res.render('select-participant.ejs',{ title : req.session.userId});
	});

	app.get('/login', function ( req, res){
		// page for users to signin
		res.render('login',{ title : "Please sign in",title2 : "" });
	});

	app.get('/logout', is_logged_in,function(req,res){
		req.session.destroy();
		res.redirect('/');
	});

	app.get('/question_detail_form', is_logged_in, function ( req, res){
		/*
			This will show the question detail 
			filling form. 
		*/
		res.render("createquiz", { title : req.session.userId, QID : req.session.Qid });
	});

	app.get('/quiz_edit_options',is_logged_in ,function (req, res){
		
		res.render('edit-what-detail.ejs',{ title : req.session.userId, Qid : req.session.Qid, Qd : req.param('data').slice(1) });
	});

	app.get('/quiz_login', is_logged_in,function (req, res){
		
		res.render('quiz_taking_login.ejs',{ title: req.session.userId});
	});

	app.get('/remove-question', is_logged_in,function (req, res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var Sid = parseInt(req.cookies.Sid);
		var remQ = (parseInt(req.param('remQ')) - 1) * 11 + 8;
		Quiz.remove_question(redis, Qid, Sid, remQ, function ( err, stat){
			if( !err ){
				res.clearCookie('Q');
				res.clearCookie('Sid');
				res.redirect('/home_creator');
			}else{
				console.log("ERR AT /remove-question INSIDE controller.js");
				res.redirect('/');
			}
		});
	});

	app.get('/remove-section',is_logged_in, function (req,res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var rmc = parseInt(req.param('id'));
		Quiz.remove_section( redis, Qid, rmc, function (err, stat){
			if( !err ){
				res.redirect('/home_creator');
			}else{
				console.log("ERR AT /remove-section INSIDE controller.js");
				res.redirect('/');
			}
		});			 
	});

	app.get('/section_detail_form', is_logged_in, function (req, res){
		/*
			This will show the section detail 
			filling form. 
		*/
		res.render('section_detail', { title : req.session.userId, QID : req.session.Qid});
	});

	app.get('/show_question_image', is_logged_in, function ( req, res) {
		var user = req.session.userId;
		var Qid = req.session.Q;
		var question = req.param('data');
		Quiz.get_log_detail( redis, user, Qid, 2, 2, function ( err, time){
			if(!err){
				res.render('problem.ejs',{ 
					title:user,
					timer : time ,
					Qid : Qid,
					text : question[0],
					image : question[1],
					pos : question[2],
					neg : question[3],
					option : question.slice(4,i+1)
				});
			}else{

			}
		});	
	});

	app.get('/show_question_text', is_logged_in, function ( req, res) {
		var user = req.session.userId;
		var Qid = req.session.Q;
		var question = req.param('data');
		Quiz.get_log_detail( redis, user, Qid, 2, 2, function ( err, time){
			if(!err){
				res.render('problem.ejs',{ 
					title:user,
					timer : time ,
					Qid : Qid,
					text : question[0],
					pos : question[2],
					neg : question[3],
					option : question.slice(4,i+1)
				});
			}else{

			}
		});	
	});
	
	app.get('/show_rules_page', is_logged_in, function (req, res){

		res.render("info.ejs",{ title : req.session.userId, Qid : req.session.Q, name : req.param('name'), rule : req.param('rule'), qc : req.param('qc')});
	});
	

	/* POST request block */
//======================================================================================================
	
	app.post('/add-section',is_logged_in ,function (req, res){
		var Qid = req.session.Q;
		console.log(Qid + ">>>>>");
		var user = req.session.userId;
		Quiz.add_section(redis, Qid, user,function (err, sec){
			if(err){
				console.log("ERR AT /add_section INSIDE controller.js");
				res.redirect('/');
			}
			else{
				var x = parseInt(sec);
				req.session.QTS = x;
				req.session.CS = x-1;
				req.session.Qid = Qid;
				res.redirect('/section_detail_form');
			}
		});
	});

	app.post('/del-quiz',is_logged_in,function (req,res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		Quiz.delete_quiz( redis, Qid, user);
		res.redirect('/home_creator'); 
	});

	app.post('/edit-quizdetail', is_logged_in,function (req,res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var acttime = req.param('acttime');
		var ip = acttime.indexOf(' ');
		var eventDate = acttime.slice(0,ip);
		var eventTime = acttime.slice(ip+1);
		var endtimex = req.param('endtime');
		ip = endtimex.indexOf(' ');
		var enddate = endtimex.slice(0,ip);
		var endtime = endtimex.slice(ip+1);
		Quiz.edit_quiz_detail( redis, Qid, req.param('password'), eventDate, eventTime, enddate, endtime, req.param('duration'), req.param('password2') );
		res.redirect('/home_creator');
	});

	app.post('/edit-sectiondetail', is_logged_in,function (req,res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var rmc = req.session.S;
		var sectiondd = parseInt(req.param('duration-days'))*86400,
		sectionhh = parseInt(req.param('duration-hours'))*3600,
		sectionmm = parseInt(req.param('duration-minutes'))*60,
		sectionDuration = ( sectiondd + sectionhh + sectionmm )*1000;
		Quiz.edit_section_detail( redis, Qid, rmc,req.param('rank'),req.param('name'), req.param('rules'), req.param('cutoff'), sectionDuration );
		res.redirect('/home_creator');
	});

	app.post('/insert-add-question',is_logged_in ,function (req, res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var Sid = parseInt(req.cookies.Sid);
		var full = [];
		full.push(req.param('questiontt1'));
		if( req.param('paths') == "0" ){
			full.push("????");
		}else{
			var str = req.files.questiontt2.path;
			var qqq = str.replace( __dirname, '');
			full.push(qqq.replace( 'public/', ''));
		}
		full.push(req.param('add'));
		full.push(req.param('sub'));
		var opt = req.param('opt');
		var len =opt[0].length;
		for( var i = 1; i < 5; i++){
			if( i < len ) full.push(opt[0][i]);
			else full.push("????");
		}
		full.push(opt[0][0]);
		full.push("RFU");
		full.push("RFU");
		Quiz.add_later_question( redis, Qid, Sid, full);
		res.redirect('/home_creator');
	});

	app.post('/insert-edit-question', is_logged_in,function (req, res){
		var user = req.session.userId;
		var Qid = req.session.Q;
		var Sid = req.cookies.Sid;
		var editQ = parseInt(req.cookies.Eq);
		var opt = req.param('opt');
		try{
			var str = req.files.questiontt2.path;	
		}catch(ex){

		}
		
		var questiontt2 = "";
		if( str ){
			var qqq = str.replace( __dirname, '');
			questiontt2 = qqq.replace( 'public/', '');	
		}
		Quiz.edit_question_detail( redis, Qid, Sid, editQ, opt, req.param('questiontt1'), req.param('add'), req.param('sub'), questiontt2);
		res.clearCookie('Sid');
		res.clearCookie('Eq');
		res.redirect('/home_creator');
	});

	app.post('/question_detail', is_logged_in, function ( req, res){
		var Qid = req.session.Qid;
		var creator = req.session.userId;
		var current_section = req.session.CS;
		var full = [];
		full.push(req.param('questiontt1'));
		if( req.param('paths') == "0" ){
			full.push("????");
		}else{
			var str = req.files.questiontt2.path;
			var qqq = str.replace( __dirname, '');
			full.push(qqq.replace( 'public/', ''));
		}
		full.push(req.param('add'));
		full.push(req.param('sub'));
		var opt = req.param('opt');
		var len =opt[0].length;
		for( var i = 1; i < 5; i++){
			if( i < len ) full.push(opt[0][i]);
			else full.push("????");
		}
		full.push(opt[0][0]);
		full.push(req.param('type'));
		full.push("RFU");
		Quiz.insert_question_detail( redis, Qid,  current_section, full);
		var btx = parseInt(req.session.CQ) + 1;
		req.session.CQ = btx;
		Quiz.set_quiz_creation_backup_detail( redis, creator, Qid, current_section, btx);
		if( btx == req.session.QTQ ){ //section complete
			var atx = parseInt(current_section) + 1;
			req.session.CS = atx;
			console.log("here 2");
			if( atx == req.session.QTS){
				Quiz.delete_quiz_creation_backup( redis, creator, Qid );
				res.redirect('/home_creator');
				//res.render('select.ejs',{ title : creator });
			}else{
				res.redirect("/section_detail_form");
			}
		}else{
			res.redirect("/question_detail_form");
		}
	});

	app.post('/quiz_detail', is_logged_in, function ( req, res){
		/*
			gathering quiz meta data which is as follows
		*/
		/*
			quiz creator's name who created it.
		*/
		var user = req.session.userId;
		/*
		 	quiz password which will allow 
		 	quiz creator to make changes in
		 	the quiz. 
		*/
		var Quizpasswd = req.param('password'), 
		/*
			It will provide access of
			quiz to the participant.
			It will act as barrier to
			the people who are not allowed
			to take the quiz, as they don't,
			know the password. 
		*/
		Quizpasswdforstud = req.param('password2');
		/* 	depricated feild
			to be removed shortly.
		*/
		totalDuration = req.param('duration'),
		/*
			total number of sections
			in the quiz.
		*/
		sectionCount = req.param('section');
		/* 
			Only within below duration
			one can see the quiz active.
		*/
		/*
			start time of quiz according to
			the main server. 
		*/
		var acttime = req.param('acttime');
		var ip = acttime.indexOf(' ');
		var eventDate = acttime.slice(0,ip);
		var eventTime = acttime.slice(ip+1,-1);
		/*
			end time of quiz according to
			the main server. 
		*/
		var endtimex = req.param('endtime');
		ip = endtimex.indexOf(' ');
		var enddate = endtimex.slice(0,ip);
		var endtime = endtimex.slice(ip+1,-1);
		/*
			storing all the meta data.....
		*/
		Quiz.insert_quiz_detail( redis, user, Quizpasswd, eventDate, eventTime, enddate, endtime, totalDuration, Quizpasswdforstud, "RFU",sectionCount, function( err, Qid){
			if ( !err ){
				/* Saving frequently accesible data in session*/
				req.session.Qid = Qid;
				req.session.QTS = sectionCount;
				req.session.CS = 0;
				res.redirect('/section_detail_form');
			}else{
				console.log("ERR AT /quiz_detail INSIDE controller.js");
				res.redirect('/');
			}
		});	
	});

	app.post('/quiz_edit', is_logged_in, function ( req, res){
		var user = req.session.userId;
		var Qid = req.param('choice');
		Redis.exists(redis, quiz_creation_backup_schema.set_name + user + ":" + Qid ,function (err, status){
			if(err){
				console.log("ERR AT /quiz_edit INSIDE controller.js");
				res.redirect('/');
			}
			else{
				if(status){
					res.redirect('/edit-complete');
				}else{
					Quiz.get_quiz_detail(redis, Qid,function (err, Qd){
						if(err){
							console.log("ERR AT /quiz_edit INSIDE controller.js");
							res.redirect('/');				
						}
						else{
							if( req.param('passwd') == Qd[1]){
								req.session.Q = Qid;
								var number_of_sections = parseInt(Qd[9]);
								Quiz.get_section_names( redis, Qid, number_of_sections, function ( err, namelist){
									if( !err ){
										Qd = Qd.concat(namelist);
										res.render('edit-what-detail.ejs',{ title:user, Qid:Qid, Qd:Qd.slice(1) });
										//res.redirect('/quiz_edit_options?data='+Qd);		
									}else{
										console.log("ERR AT /quiz_edit INSIDE controller.js");
										res.redirect('/');					
									}
								});
							}else{
								res.cookie('W',0);
								res.redirect('/edit-edit');
							}		
						}
					});
				}	
			}
		});
	});

	app.post('/section_detail', is_logged_in, function ( req, res){
		var Qid = req.session.Qid,
		creator = req.session.userId,
		rank = req.param('rank'),
		sectionName = req.param('name'),
		rulesBlog = req.param('rules'),
		sectionCutoff = req.param('cutoff'),
		sectiondd = parseInt(req.param('duration-days'))*86400,
		sectionhh = parseInt(req.param('duration-hours'))*3600,
		sectionmm = parseInt(req.param('duration-minutes'))*60,
		sectionDuration = ( sectiondd + sectionhh + sectionmm   )*1000,
		totalQuestions = req.param('Qno');
		req.session.QTQ = totalQuestions;
		req.session.CQ = 0;
		Quiz.insert_section_detail( redis, creator, Qid, req.session.CS, rank, sectionName, rulesBlog, totalQuestions, sectionCutoff, sectionDuration, "RFU", "RFU", function ( err, reply){
			if( !err ){
				res.redirect('/question_detail_form');
			}else{
				console.log("ERR AT section_detail INSIDE controller.js");
				res.redirect('/');
			}
		});
	});

	app.post('/show_incomplete',is_logged_in ,function ( req, res){
		var creator = req.session.userId;
		var Qid = req.param('choice');
		req.session.Qid = Qid;
		Quiz.get_quiz_creation_backup_detail( redis, creator, Qid, function (err, result){
			if( !err ){
				Quiz.get_quiz_section_count( redis, Qid, function (err, section){
					if(err){
						console.log("ERR AT /show_incomplete INSIDE controller.js");
						res.redirect('/');
					}else{
						if( (result[0] == 0) && (result[1] == 0)){
							Redis.exists( redis, section_schema.set_name + Qid + ":" + result[0], function (err, status){
								if(err){
									console.log("ERR AT /showincomplete INSIDE controller.js");
									res.redirect('/');
								}
								else{
									if( status == false ){
										req.session.QTS = section;
										req.session.CS = parseInt(result[0]);
										req.session.CQ = parseInt(result[1]);
										res.redirect("/section_detail_form");
									}else{
										Quiz.get_section_question_count( redis, Qid, 0,function (err, totalQinS){
											if(err){
												console.log("ERR AT /showincomplete INSIDE controller.js");
												res.redirect('/');
											}else{
												req.session.QTQ = totalQinS;
												req.session.QTS = section;
												req.session.CS = parseInt(result[0]);
												req.session.CQ = parseInt(result[1]);
												res.redirect('/question_detail_form');	
											}
										});
									}
								}
							});
						}else{
							Quiz.get_section_question_count( redis, Qid, result[0],function (err, totalQinS){
								if(err){
									console.log("ERR AT /showincomplete INSIDE controller.js");
									res.redirect('/');
								}else{
									if(result[1] == totalQinS){
										req.session.QTS = section;
										req.session.CS = parseInt(result[0]) + 1;
										req.session.CQ = 0;
										res.redirect('/section_detail_form');
									}else{
										req.session.QTQ = totalQinS;
										req.session.QTS = section;
										req.session.CS = parseInt(result[0]);
										req.session.CQ = parseInt(result[1]);
										res.redirect('/question_detail_form');
									}
								}
							});
						}
					}
				});
			
			}else{
				console.log("ERR AT /show_incomplete INSIDE controller.js");
				res.redirect('/');
			}
		});							
	});

	app.post('/show_quiz', is_logged_in,  function ( req, res){
		var user = req.session.userId;
		var Qid  = req.session.Q;
		console.log('user : ' + user + ' Qid : ' + Qid);
		/* Retriving user status */
		Quiz.get_log_detail( redis, user, Qid, 0, -1, function (err, log_detail){
			if( !err ){
				/*
					checking wether its first question.
					if it's not store answer...
				*/
				if( log_detail[1] != "0" ){
					/* store user solution */
					Quiz.append_user_answer( redis, user, Qid, function (err, stat){
						if( err ){
							console.log("ERR AT /show_quiz INSIDE controller.js");
							res.redirect('/');
						}		
					});
				}
				/*
					check if it the last question
					of the section or not
				*/
				Quiz.get_section_detail( redis, Qid, log_detail[ log_schema.section_count], 3, 5, function (err, section_detail){
					if( !err ){
						if( log_detail[ log_schema.question_count] == section_detail[0]){
							/* 
								if it is the last question
								check further if it is the
								last section......
							*/
							Quiz.generate_section_result( redis, user, Qid, log_detail[ log_schema.section_count], function ( err, stat){
								if( !err ){
									Quiz.get_quiz_detail_generic( redis, Qid, 9, -1, function ( err, quiz_detail){
										if( !err ){
											if( parseInt(quiz_detail[0]) - 1 == log_detail[0]){
												/*
												   so the quiz has ended
												   send him to show result 
												*/
												Quiz.do_end_quiz_task( redis, user, Qid);
												res.redirect('/eval');
											}else{
												/*
													show himm next sectoin detail
													and process previous section
													result
												*/
												var new_section = parseInt(log_detail[ log_schema.section_count]) + 1;
												Quiz.get_section_detail( redis, Qid, new_section, 0, 5, function ( err, sec_detail){
													if( !err ){
														Quiz.edit_log_detail( redis, user, Qid, log_schema.section_count, new_section);
														Quiz.edit_log_detail( redis, user, Qid, log_schema.question_count, 0);
														Quiz.edit_log_detail( redis, user, Qid, log_schema.duration, sec_detail[5]);
														res.redirect('/show_rules_page?name='+ sec_detail[1] + "&rule=" + sec_detail[2] + "&qc=" + sec_detail[3]);
													}else{	
														console.log("ERR AT /show_quiz INSIDE controller.js");
														res.redirect('/');
													}
												});
											}
										}else{
											console.log("ERR AT /show_quiz INSIDE controller.js");
											res.redirect('/');
										}
									});		
								}else{
									console.log("ERR AndT /show_quiz INSIDE controller.js");
									res.redirect('/');	
								}
							});
							
						}else{
							/* render the next question */
							Quiz.get_question_detail( redis, Qid, log_detail[0], log_detail[1], function  (err, question_data){
								if( !err ){
									var time = parseInt(req.param('time'));
									var time_previous = parseInt(req.session.time_previous);
									var current_time = new Date().getTime();
									var browser_time_diffrence =  time_previous - time;
									var server_time_diffrence = current_time - req.session.time;
									if( server_time_diffrence < browser_time_diffrence + 111 ){
										res.redirect('/cheat');
									}else{											
										req.session.time_previous = time;
										req.session.time = current_time;
										Quiz.edit_log_detail( redis, user, Qid, log_schema.question_count, parseInt(log_detail[1]) + 1);
										Quiz.edit_log_detail( redis, user, Qid, log_schema.duration, time);
									}
									if( question_data[ question_schema.img] == "????"){
										/* Question contains no image */
										res.redirect('/show_question_text?time='+time+'?data='+question_data);
									}else{
										res.redirect('/show_question_image?time='+time+'?data='+question_data);						
									}
								}else{
									console.log("ERR AT /show_quiz INSIDE controller.js");
									res.redirect('/');
								}
							});

						}
					}else{
						console.log("ERR AT /show_quiz INSIDE controller.js");
						res.redirect('/');
					}
				});
				
			}else{
				console.log("ERR AT /show_quiz INSIDE controller.js");
				res.redirect('/');
			}
		});
	});

	app.post('/signin', function ( req, res){
		res.redirect('/login'); 
	});

	app.post('/validate',function ( req,res){
		/*
			validation of user credentials
			checking both username and password
		*/
		var user = req.param('uid');
		var passwd = req.param('passwd');
		User.validate_user( redis, user, passwd, function ( err, result){
			if( !err ){
				if( result ){
					/*
						if true we will createa session
						for that user and route him to
						the home page according to the 
						role chosen by him.
					*/
					/* allowing him to route on
					   other page by using the
					   defined middleware.
					*/
					req.session.isLoggedIn = true;
					/*
						Inserting his username in
						session.
					*/
					req.session.userId = user;

					if( req.param('role') == 'creator'){
						/* 
							on true sending him
							creator's home page.
						*/
						req.session.role = "creator";
						res.redirect('/home_creator');
					}else{
						/* 
							on true sending him
							creator's home page.
						*/
						// res.render('select.ejs',{ title : user });	
						req.session.role = "participant";
						res.redirect('/home_participant');
					}
				}else{
					/* 
						if false the must have
						submitted either wrong 
						password or username so
						we will send him a warning
						message.
					*/
					res.redirect('login',{ title : "Please sign in",title2 : "Wrong Username or Password" });
				}
			}else{
					console.log("ERR AT /validate");
				}
		});
	});

	app.post('/validate_quiz_id', is_logged_in,function (req,res){
		var user = req.session.userId;
		var Qid = req.param('Qid');
	 	var passwd = req.param('passwd');
	 	/*
			first of all validate qid and password
	 	*/
	 	Quiz.validate_quiz_credentials( redis, Qid, passwd, function ( err, status){
	 		if( !err ){
	 			if( status ){
	 				/* 
	 					if credentials is correct 
						check if they have taken
						it, before or not
	 				*/
	 				Redis.exists( redis, proof_schema.set_name + user + ":" + Qid, function (err, status){
	 					if( !err ){
	 						if( status == 0 ){
	 							/*
									check if user is new or
									he was dissconnected once. 
	 							*/
	 							Quiz.get_log_detail_with_existance( redis, user, Qid, 0, -1, function ( err, status, log_detail){
	 								if( !err ){
	 									if( status == "exists"){
	 										/*
												set his log information into
												his session.
	 										*/

	 									}else{
	 										req.session.Q = Qid;
	 										Quiz.get_section_detail( redis, Qid, 0, 0, 5, function ( err, sec_detail){
	 											if( !err ){
	 												Quiz.set_log_detail( redis, user, Qid, 0, 0, sec_detail[ section_schema.section_duration],3, function (err, status){
	 													if( !err ){
	 														Quiz.initilise_user_answer_list( redis, user, Qid, function (err, stat){
	 															if( !err ){

	 															}else{
	 																console.log("ERR AT /validate_quiz_id INSIDE controller.js");
	 																res.redirect('/');
	 															}
	 														});
	 														res.redirect('/show_rules_page?name='+ sec_detail[1] + "&rule=" + sec_detail[2] + "&qc=" + sec_detail[3]);
	 													}else{
	 														console.log("ERR AT /validate_quiz_id INSIDE controller.js");
	 														res.redirect('/');
	 													}
	 												});
	 											}else{
	 												console.log("ERR AT /validate_quiz_id INSIDE controller.js");
	 												res.redirect('/');
	 											}
	 										});
	 									}
	 								}else{
	 									console.log("ERR AT /validate_quiz_id INSIDE controller.js");
	 									res.redirect('/');
	 								}
	 							});

	 						}else{
	 							/* 
	 								since he/she had already taken the quiz
									show them the result page of theirs.....
	 							*/
	 							res.redirect(''); // To be done.......
	 						}
	 					}
	 				});
	 			}else{
	 				res.redirect('/quiz_login');
	 			}
	 		}else{
	 			console.log("ERR AT /validate_quiz_id INSIDE controller.js");
	 			res.redirect('/');
	 		}
	 	});
	});
}
//------------------------------------------------------------------------------------------------------------------------------
/* Extra required functions */

function is_logged_in(req, res, next) {

	// if user is authenticated in the session, carry on 
	if (req.session.isLoggedIn == true)
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}
