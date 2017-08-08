const cheerio = require('cheerio');
var jsonfile = require('jsonfile');
var request = require('request');

jsonfile.spaces = 4;
request = request.defaults({jar: true, followAllRedirects:true});

var config=jsonfile.readFileSync("config.json");


const node_id='64836';

var prev_id='';
var curr_id='';

var data={};

function mk_init(){
	request.get({uri:'https://kyberia.sk/id/1'}, mk_login);
}

function mk_login(err, response, body){
		request.post(
		{
			uri:'https://kyberia.sk/id/3449/',
			formData:{
				login_type:"name", 
				screen_width:"1920", 
				screen_height:"1280", 
				event: "login", 
				login:config.username, 
				password:config.password
			}
		},get_page);
}

function list_page(params){
	console.log('next page');
	request.post(
		{
			uri:'https://kyberia.sk/id/'+config.node_id,
			formData: params
		}, parse_response);
}

function get_page(err,response,body){
	request.get({uri:'https://kyberia.sk/id/'+config.node_id}, parse_response);
}
function parse_response(err,response,body){
	curr_id='';
	var params=get_fields(body);
	console.log(params);
	get_data(body);
	console.log(curr_id);
	jsonfile.writeFileSync("data.json", data);
	if(curr_id!='' && curr_id!=prev_id)
	{
		prev_id=curr_id;
		console.log('load_next');
		list_page(params);
	}
	else{
		console.log('finished');
		jsonfile.writeFileSync("data.json", data);
	}
}
function get_data(body){
	const $ = cheerio.load(body);
	$('small.mood').remove();
	var nodes=$("form[name='formular'] table");
	for(var i=0;i<nodes.length;i++){
		var nd=cheerio(nodes[i]);
		var self=nd.find("tr.header div a").attr('href');
		
		var parent=nd.find("a.childVector").attr('href');
		var txt=nd.find("tr.header + tr td").text().trim();
		
		if(!data[self] && parent && self){
			var obj={p:parent, t: txt};
			data[self]=obj;
			curr_id=self;
		}
	}
}
function get_fields(body){
	const $ = cheerio.load(body);
	return {anticsrf:$("input[name='anticsrf']").val(), get_children_offset: $("input[name='get_children_offset']").val(), listing_amount: $("input[name='listing_amount']").val(), get_children_move:'>'};
}

mk_init();