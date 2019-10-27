var ws = new ReconnectingWebSocket('ws://localhost:3000');
console.log("here");
ws.onopen = () => {

}

ws.onmessage = (e) => {
	// new_node_event
	let data = JSON.parse(e.data)

	if (!data.hasOwnProperty('channel') || !data.hasOwnProperty("payload"))
		return;

	if (data.channel == "new_node_event") {
		let res = data.payload.split("|");
		$$("node_registration_table").add({
			id: res[0], node_ip_column: res[1], registration_time: res[2], last_heartbeat_time: -1
		});
	}

	if (data.channel == "delete_node_event") {
		let res = data.payload.split("|");
		$$("node_registration_table").remove(res[0]);
	}

	if (data.channel == "new_node_heartbeat_event") {
		let res = data.payload.split("|");
		let update_row = $$("node_registration_table").getItem(res[0]);
		update_row.last_heartbeat_time = res[1];

		$$("node_registration_table").updateItem(res[0], update_row);
	}
}

ws.onerror = (e) => {

}

ws.onclose = (e) => {
	
}

webix.ui({
	rows:[
		{gravity: 1, view: "label", label: "CLOUD COMPUTING PROJECT"},
		{
			gravity: 8,
			cols: [
				{
					gravity: 1,
					view:"sidebar",
					// css:theme,
					width:200,
					// collapsed:(screen !== "wide")
					data:[
						{ id:"transactions", value: "Dashboard", icon:"mdi mdi-cart" },
						{ id:"customers", value: "Administration", icon:"mdi mdi-account-box", data:[
							{ id: "dashboard1", value: "Administration 1"},
							{ id: "dashboard2", value: "Administration 2"}
						]},
					], on:{
						onAfterSelect: function(id){
							webix.message("Selected: "+this.getItem(id).value)
						}
					}
				}, {
					gravity: 5,
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
					]
				},
				{gravity: 1}
			]
		}
	]
});

