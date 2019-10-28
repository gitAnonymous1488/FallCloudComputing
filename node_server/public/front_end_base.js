var ws = new ReconnectingWebSocket('ws://localhost:3000');
// console.log("here");


let BEGIN_NODE_INSERT = false, BEGIN_PROCESS_INSERT = false;
ws.onopen = () => {

}

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
							// webix.message("Selected: "+this.getItem(id).value)

							$$("center_view_multi").setValue(id);
						}
					}
				}, {
					view: "multiview",
					id: "center_view_multi",
					gravity: 5,
					cells: [
						{id:"dashboard", template: "Dashoboard"},
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
										console.log(res)
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
									id:"process_pid", header:"Process PID", width:200, tooltip:false
								}, {
									id:"process_ip", header:"Process IP", width:200, tooltip:false
								}, {
									id:"process_name", header:"Process Name", width:200, tooltip:false
								}, {
									id:"last_heartbeat_time", header:"Last Node Heartbeat Time", width:200, tooltip:false
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
												last_heartbeat_time: a.process_heartbeat_time
											})
										});

										BEGIN_PROCESS_INSERT = true;
										console.log(res)
									}
								})
							}
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