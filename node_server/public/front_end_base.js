var ws = new ReconnectingWebSocket('ws://localhost:3000');
// console.log("here");


let BEGIN_NODE_INSERT = false, BEGIN_PROCESS_INSERT = false;
ws.onopen = () => {

}

// let TRANSLATED_STATES = {
// 	"b"
// }

ws.onmessage = (e) => {

	let res = null;

	// new_node_event
	let data = JSON.parse(e.data);

	// console.log(data);

	if (!data.hasOwnProperty('channel') || !data.hasOwnProperty("payload"))
		return;

	res = data.payload.split("|");

	if (!BEGIN_NODE_INSERT || !BEGIN_PROCESS_INSERT) {
		return;
	}

	if (data.channel == "new_node_event") {
		$$("node_registration_table").add({
			id: res[0], node_ip_column: res[1], registration_time: res[2], last_heartbeat_time: -1
		});
	}

	if (data.channel == "delete_node_event") {
		$$("node_registration_table").remove(res[0]);
	}

	if (data.channel == "new_node_heartbeat_event") {
		let update_row = $$("node_registration_table").getItem(res[0]);

		if (update_row == undefined)
			return;

		update_row.last_heartbeat_time = res[1];
		$$("node_registration_table").updateItem(res[0], update_row);
	}

	if (data.channel == "new_process_event") {
		$$("process_registration_table").add({
			id: res[0], process_pid: res[1], process_ip: res[2], process_name: res[3], last_heartbeat_time: -1
		})
	}

	if (data.channel == "delete_process_event") {
		$$("process_registration_table").remove(res[0]);
	}

	if (data.channel == "new_process_heartbeat_event") {
		let update_row = $$("process_registration_table").getItem(res[0]);

		if (update_row == undefined)
			return;
		
		update_row.last_heartbeat_time = res[1];
		$$("process_registration_table").updateItem(res[0], update_row);
	}

	if (data.channel == "process_update") {
		// console.log(data)
		let json_data = null, row;

		try {
			json_data = JSON.parse(data.payload)
		} catch (e) {
			console.log("Could not parse incoming process_update msg")
			return;
		}

		let update_row = $$("process_registration_table").getItem(json_data.registration_id);

		if (json_data.hasOwnProperty("state"))
			update_row.process_state = json_data.state;

		if (json_data.hasOwnProperty("update")) {
			if (json_data.update == "start_job"){
				update_row.process_job_id = json_data.job_id;
			} else if (json_data.update == "finnish_job") {
				update_row.process_job_id = "-";
			}

			if (json_data.update == "start_job") {

				row = $$("dashboard").find((obj) => {
					return obj.id == json_data.job_id;
				});

				if (row.length == 0)
					return console.error("Start/Finish_Job, Cannot Find Row In Dashboard With ID: " + payload.job_id);

				if (json_data.name == "image_processing") {
					row.current_state = "Image Processing";
					row.next_state = "Finished Image Processingn";
				} else if (json_data.name == "facial-detection") {
					row.current_state = "Facial Detection";
					row.next_state = "Finished Facial Detection";
				} else if (json_data.name == "facial-recognition") {
					row.current_state = "Facial Recognition";
					row.next_state = "Finished Facial Recognition";
				}

				$$("dashboard").updateItem(json_data.job_id, row);	

			}
		} 
		// update_row 

		// console.log(json_data)
	}

	if (data.channel == "submission_job") {
		let payload;

		try {
			payload = JSON.parse(data.payload)
		} catch (e) {
			console.error("Tried Parsing \"submission_job\" websocket");
			return console.error(e);
		}

		$$("dashboard").add({
			id: payload.job_id, current_state: "Submitted", next_state: "Image Processing", submission_time: payload.submission_time
		}, 0);
	}

	if (data.channel == "image_job") {
		let payload, rows, row;
		try {
			payload = JSON.parse(data.payload)
		} catch (e) {
			console.error("Tried Parsing \"image_job\" websocket");
			return console.error(e);
		}

		row = $$("dashboard").getItem(payload.job_id);

		// rows = $$("dashboard").find((obj) => {
		// 	return obj.id == payload.job_id;
		// });

		// console.log($$("dashboard").getItem(payload.job_id))

		console.log(row);

		if (row == undefined)
			return console.error("Submission, Cannot Find Row In Dashboard With ID: " + payload.job_id);

		// row = rows[0];

		row.current_state = "Finished Image Processing";
		row.next_state = "Facial Detection";

		$$("dashboard").updateItem(row.id, row);
	}

	if (data.channel == "detection_job") {
		let payload, row;
		try {
			payload = JSON.parse(data.payload)
		} catch (e) {
			console.error("Tried Parsing \"detection_job\" websocket");
			return console.error(e);
		}

		row = $$("dashboard").getItem(payload.job_id);

		if (row == undefined)
			return console.error("Facial Detection, Cannot Find Row In Dashboard With ID: " + payload.job_id);

		row.current_state = "Finished Facial Detection";
		row.next_state = "Facial Recognition";

		$$("dashboard").updateItem(row.id, row);
	}

	if (data.channel == "recognition_job") {
		let payload, row;

		try {
			payload = JSON.parse(data.payload)
		} catch (e) {
			console.log(data.payload)
			console.error("Tried Parsing \"recognition_job\" websocket");
			return console.error(e);
		}

		row = $$("dashboard").getItem(payload.job_id);

		console.log(row);

		if (row == undefined)
			return console.error("Facial Recognition, Cannot Find Row In Dashboard With ID: " + payload.job_id);

		row.current_state = "Finished Facial Recognition";
		row.next_state = "-";
		row.submission_time_finish = payload.submission_time;
		row.processing_time = parseInt(row.submission_time_finish) - parseInt(row.submission_time);

		$$("dashboard").updateItem(row.id, row);
	}

}

ws.onerror = (e) => {

}

ws.onclose = (e) => {
	
}

let process_context_menu = {
	view:"contextmenu",
	id:"process_menu",
	data:["Kill"],
	on:{
		onItemClick:function(id){
			// console.log(this.getContext().id.row)
			let selected_row = $$("process_registration_table").getItem(this.getContext().id.row);
			if (!selected_row) return;

			$.ajax({
				url: "http://" + selected_row.process_ip + ":4001/kill/" + selected_row.process_pid,
				type: "DELETE",
				contentType: "application/text",
				headers: {
					// "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					// "Access-Control-Allow-Headers": "x-requested-with",
					// 'Access-Control-Allow-Origin': '*',
				},
				success: function(data, text) {

					console.log(data, text);

				}, error: function(request, status, error) {

					console.log(request, status, error);

				}
			});     
		}
	},  
};

let node_context_menu = {
	view:"contextmenu",
	id:"node_menu",
	data:[{
		id:"1",value:"START",  
		submenu:[ "image_processing", "facial-detection", "facial-recognition" ],
		config:{
			on: { 
				onItemClick:function(id){
					// console.log($$("node_menu").getContext());
					// console.log(id);

					let selected_row = $$("node_registration_table").getItem($$("node_menu").getContext().id.row);
					if (!selected_row) return;

					$.ajax({
						url: "http://" + selected_row.node_ip_column + ":4001/start/" + id,
						type: "POST",
						contentType: "application/text",
						headers: {
							// "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
							// "Access-Control-Allow-Headers": "x-requested-with",
							// 'Access-Control-Allow-Origin': '*',
						},
						success: function(data, text) {

							console.log(data, text);

						}, error: function(request, status, error) {

							console.log(request, status, error);

						}
					});   
				}
			}
		},
	}], 
};

let retrieve_logs = function(ip,  pid, cb) {

	$.ajax({
		url: "http://" + ip + ":4001/logs/" + pid,
		type: "GET",
		contentType: "application/text",
		headers: {

		},
		success: function(data, text) {

			// console.log(data, text);
			$$("process_logs_textarea").setValue(data.result);
			cb();
			// $$("center_view_multi").setValue("process_logs_text");

		}, error: function(request, status, error) {

			cb(error);

			console.log(request, status, error);

		}
	});
} 

webix.ui({
	rows:[
		{gravity: 1, view: "label", label: "CLOUD COMPUTING PROJECT", align:"center"},
		{
			gravity: 8,
			cols: [
				{
					gravity: 1,
					view:"sidebar",
					id: "prject_menu",
					// css:theme,
					width:200,
					// collapsed:(screen !== "wide")
					data:[
						{ id:"dashboard", value: "Dashboard", icon:"mdi mdi-cart" },
						{ id:"customers", value: "Administration", icon:"mdi mdi-account-box", data:[
							{ id: "node_registration_table", value: "Node View"},
							{ id: "process_registration_table", value: "Process View"}
						]},
					], ready: function() { $$("prject_menu").select("dashboard"); }, on:{
						onAfterSelect: function(id){

							$$("center_view_multi").setValue(id);
						}
					}
				}, {
					view: "multiview",
					id: "center_view_multi",
					gravity: 5,
					cells: [
						{
							id:"dashboard", 
							view:"datatable", 
							autoConfig:true, 
							columns:[
								// {
								// 	id:"id", header:"#", width:40, sort:"int", tooltip:false
								// }, 
								{
									id:"id", header:"User Job Submission ID", width:350, tooltip:false
								}, {
									id:"current_state", header:"User Job State", width:200, tooltip:false
								}, {
									id:"next_state", header:"Waiting On State", width:200, tooltip:false
								}, {
									id: "submission_time", header:"Time Submission Came In", width:200, tooltip:false
								}, {
									id: "submission_time_finish", header:"Time Submission Processed", width:200, tooltip:false
								}, {
									id: "processing_time", header:"Time To Process", width:200, tooltip:false
								}
							], data: [],
						},
						{
							view:"datatable", 
							id: "node_registration_table",
							autoConfig:true, 
							columns:[
								{
									id:"id", header:"#", width:40, sort:"int", tooltip:false
								}, {
									id:"node_ip_column", header:"Node IP", width:200, tooltip:false
								}, {
									id:"registration_time", header:"Node Registration Time", width:200, tooltip:false
								}, {
									id:"last_heartbeat_time", header:"Last Node Heartbeat Time", width:200, tooltip:false
								}
							], data: [],
							ready: function() {
								$.ajax({
									url: "http://localhost:3000/node_registration_table",
									type: "GET",
									dataType: "json",
									success: function(res) {

										res.forEach( a => {
											$$("node_registration_table").add({
												id: a.node_registration_id, node_ip_column: a.node_ip, registration_time: a.registration_time, last_heartbeat_time: a.node_heartbeat_time
											})
										});

										BEGIN_NODE_INSERT = true;
										// console.log(res)
									}
								})
							}
						},
						{
							view:"datatable", 
							id: "process_registration_table",
							autoConfig:true, 
							columns:[
								{
									id:"id", header:"#", width:40, sort:"int", tooltip:false
								}, {
									id:"process_pid", header:"Process PID", width:75, tooltip:false
								}, {
									id:"process_ip", header:"Process IP", width:125, tooltip:false
								}, {
									id:"process_name", header:"Process Name", sort:"string", width:175, tooltip:false
								}, {
									id:"process_state", header:"Process State", width:100, tooltip:false
								}, {
									id:"process_job_id", header:"Currently Processing", width:350, tooltip:false
								},{
									id:"last_heartbeat_time", header:"Last Node Heartbeat Time", width:175, tooltip:false
								}
							], data: [],
							ready: function() {
								$.ajax({
									url: "http://localhost:3000/process_registration_table",
									type: "GET",
									dataType: "json",
									success: function(res) {


										res.forEach( a => {
											$$("process_registration_table").add({
												id: a.process_registration_id, 
												process_pid: a.process_pid, 
												process_ip: a.process_host_ip, 
												process_name: a.process_name,
												process_state: "READY",
												process_job_id: "-",
												last_heartbeat_time: a.process_heartbeat_time
											})
										});

										BEGIN_PROCESS_INSERT = true;
										// console.log(res)
									}
								})
							},
							on: {
								onItemClick: function(id, e, node) {
									let row = this.getItem(id);

									if (!row) return console.log("There is no row with id: " + id);

									if (!row.hasOwnProperty("process_pid")) return console.log("There is no process_pid key in the row");

									if (!row.hasOwnProperty("process_ip")) return console.log("There is no process_ip key in the row");

									retrieve_logs(row.process_ip, row.process_pid, (err) => {
										if (err) return;

										$$("process_logs_ip").setValue(row.process_ip);
										$$("process_logs_pid").setValue(row.process_pid);

										$$("center_view_multi").setValue("process_logs_text");
									})
								}
							}
						}, {
							id: "process_logs_text",
							rows: [

								{
									cols: [
										{
											view:"button",
											value: "Back",
											on: {
												onItemClick: function() {
													$$("center_view_multi").setValue("process_registration_table");
												}
											}
										}, {
											gravity: 5,
											view: "label",
											id: "process_logs_ip",
											label: "",
											align:"center"
										},{
											gravity: 5,
											view: "label",
											id: "process_logs_pid",
											label: "",
											align:"center"
										}, {
											view:"button",
											value: "Refresh",
											on: {
												onItemClick: function() {
													let ip = $$("process_logs_ip").getValue();
													let pid = $$("process_logs_pid").getValue();

													retrieve_logs(ip, pid, (err) => {
														if (err) return;


													});
												}
											}
										}
									]
								}, {
									view: "textarea",
									id: "process_logs_textarea"
								}

							]
							// view: "textarea",
							
						}
					]
				},
				{gravity: .5}
			]
		}
	]
});

webix.ui(node_context_menu).attachTo($$("node_registration_table"));
webix.ui(process_context_menu).attachTo($$("process_registration_table"));

// 2|29987|192.168.1.205|facial-detection|1572178039