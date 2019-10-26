const port = 3000;
const config_json = require("../config.json");


const http = require('http');
const web_socket = require('ws');
const heartbeats = require('heartbeats');


const express = require('express');
const app = express();


const hb_timer = 4000;


// ############### HEARTBEAT THE SERVER ###############
const heart = heartbeats.createHeart(hb_timer);
heart.createEvent(1, function(count, last){
	pool.connect((err, client, done) => {
		if (err) throw err;

		client.query("SELECT * FROM node_cron_job_cleanup();", [], (err, res) => {
			done();

			if (err) throw err;

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

	// ws.send('something');
	// console.log("Connection")
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
	"port": config_json.database_connections.port
};

const { Pool } = require('pg');
const pool = new Pool(db_config);

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
});

pool.connect((err, client, done) => {
	if (err) throw err;

	client.on('notification', function(msg) {

		broadcast_msg(JSON.stringify(msg));
	});
	
	var query = client.query("LISTEN delete_node_event");
});

pool.connect((err, client, done) => {
	if (err) throw err;

	client.on('notification', function(msg) {
		broadcast_msg(JSON.stringify(msg));
	});
	
	var query = client.query("LISTEN new_node_heartbeat_event");
});

pool.connect((err, client, done) => {
	if (err) throw err;

	client.on('notification', function(msg) {
		broadcast_msg(JSON.stringify(msg));
	});
	
	var query = client.query("LISTEN new_node_event");
});

pool.connect((err, client, done) => {
	if (err) throw err;

	client.on('notification', function(msg) {
		broadcast_msg(JSON.stringify(msg));
	});
	
	var query = client.query("LISTEN delete_process_event");
});

pool.connect((err, client, done) => {
	if (err) throw err;

	client.on('notification', function(msg) {
		broadcast_msg(JSON.stringify(msg));
	});
	
	var query = client.query("LISTEN new_process_heartbeat_event");
});

pool.connect((err, client, done) => {
	if (err) throw err;

	client.on('notification', function(msg) {
		broadcast_msg(JSON.stringify(msg));
	});
	
	var query = client.query("LISTEN new_process_event");
});

// ###############################################

http_server.listen(port);

app.get('/', (req, res) => res.send('Hello World!'))
app.use(express.static('public'))

// app.listen(port, () => {})
