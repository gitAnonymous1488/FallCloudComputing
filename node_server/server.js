const port        = 3000;
const config_json = require("../config.json");
const fs          = require("fs");


const http        = require('http');
const web_socket  = require('ws');
const heartbeats  = require('heartbeats');


const express     = require('express');
var bodyParser    = require("body-parser");
const app         = express();


const hb_timer    = 4000;

const uuidv4      = require('uuid/v4');


// ############### HEARTBEAT THE SERVER ###############
const heart = heartbeats.createHeart(hb_timer);
heart.createEvent(1, function(count, last){
	pool.connect((err, client, done) => {
		if (err) {
			console.log(err);
			throw err;
		}


		client.query("SELECT * FROM node_cron_job_cleanup();", [], (err, res) => {
			done();

			if (err) {
				console.log(err);
				throw err;
			}

		});

	});
});

heart.createEvent(1, function(count, last){
	pool.connect((err, client, done) => {
		if (err) {
			console.log(err);
			throw err;
		}

		client.query("SELECT * FROM process_cron_job_cleanup();", [], (err, res) => {
			done();

			if (err) {
				console.log(err);
				throw err;
			}

		});
	});
});
// ############### HEARTBEAT THE SERVER ###############


var http_server = http.createServer(app);

// ############### WEBSOCKET SERVER ###############
// THIS CAN BE ITS OWN FILE I THINK
const wss = new web_socket.Server({ server: http_server });

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('received: %s', message);
	});
});

function broadcast_msg(msg) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === web_socket.OPEN) {
			client.send(msg);
		}
	});
}
// ###############################################

// ############### PG CONNECTION ###############
const db_config = {
	"user": config_json.database_connections.user,
	"password": config_json.database_connections.password,
	"host": config_json.database_connections.host,
	"database": config_json.database_connections.database,
	"port": config_json.database_connections.port,
	max: 20,
};

const { Pool } = require('pg');
const pool = new Pool(db_config);

function pg_notify_channels(channel) {
	pool.connect((err, client, done) => {
		if (err) throw err;

		client.on('notification', function(msg) {

			broadcast_msg(JSON.stringify(msg));
		});
		
		var query = client.query("LISTEN " + channel + ";");
	});
}

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
});

pg_notify_channels("delete_node_event");
pg_notify_channels("new_node_heartbeat_event");
pg_notify_channels("new_node_event");
pg_notify_channels("delete_process_event");
pg_notify_channels("new_process_heartbeat_event");
pg_notify_channels("new_process_heartbeat_event");
pg_notify_channels("new_process_event");
pg_notify_channels("process_update");
pg_notify_channels("submission_job");
pg_notify_channels("image_job");
pg_notify_channels("detection_job");
pg_notify_channels("recognition_job");

// ###############################################


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/node_registration_table", (req, res) => {
	pool.connect((err, client, done) => {
		if (err) throw err;
		
		client.query("SELECT * FROM initialize_node_registration_data;", (err, result) => {
			done();
			if (err) throw err;

			res.status(200).json(result.rows);
		});
	});
});

app.get("/process_registration_table", (req, res) => {
	pool.connect((err, client, done) => {
		if (err) throw err;
		
		client.query("SELECT * FROM initialize_process_registration_data;", (err, result) => {
			done();
			if (err) throw err;

			res.status(200).json(result.rows);
		});
	});
});

app.post("/user_submission", (req, res) => {

	if (!req.body.photo) {
		return res.status(404).json({"err": "Did not pass in photo."});
	}

	if (!req.body.photo_name) {
		return res.status(404).json({"err": "Did not pass in photo name."});
	}

	let file_name = __dirname.replace("node_server", "") + "saved_imgs/";
	file_name += req.body.photo_name.replace(".jpg", "");
	file_name +=  ("_" + Math.floor(new Date().getTime() / 1000) + ".jpg");
	let b64_photo = new Buffer.from(req.body.photo, 'base64');

	fs.writeFile(file_name, b64_photo, (err) => {

	    if (err) throw err;

	    pool.connect((err, client, done) => {
	    	if (err) throw err;
	    	
	    	let query = "SELECT * FROM user_submision_insert($1,$2);"
	    	client.query(query, [uuidv4(), file_name],(err, result) => {
	    		done();
	    		if (err) throw err;

	    		res.status(200).json(result.rows);
	    	});
	    });
	});
});

app.use(express.static('public'));

// ############### PREVENT CORS ERRR ###############
app.use(function(req, res, next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
	res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
	next();
});

app.all('/', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
	res.header("Access-Control-Allow-Headers", "'Accept, Authorization, Content-Type, X-Requested-With, Range");
	next();
 });
// ############### PREVENT CORS ERRR ###############

http_server.listen(port);