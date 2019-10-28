CREATE VIEW initialize_node_registration_data AS
SELECT nrt.node_registration_id, nrt.node_ip, nrt.registration_time, 
		MAX(nht.node_heartbeat_time) as node_heartbeat_time 
FROM node_registration_table nrt
JOIN node_heartbeat_table nht on nht.node_registration_id = nrt.node_registration_id
GROUP BY nrt.node_registration_id;