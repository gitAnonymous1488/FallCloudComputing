CREATE VIEW initialize_process_registration_data AS
SELECT prt.process_registration_id, prt.process_pid, prt.process_host_ip, prt.process_name, prt.registration_time,
		MAX(pht.process_heartbeat_time) as process_heartbeat_time 
FROM process_registration_table prt
JOIN process_heartbeat_table pht on pht.process_registration_id = prt.process_registration_id
GROUP BY prt.process_registration_id;