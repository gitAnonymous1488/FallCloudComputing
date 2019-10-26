-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION insert_process_registration(
	IN in_name TEXT,
	IN in_pid INTEGER,
	IN in_ip TEXT
) RETURNS INTEGER AS $$
DECLARE out_registration_id INTEGER;
BEGIN

	INSERT INTO process_registration_table (process_pid, process_host_ip, process_name)
	VALUES (in_pid, in_ip, in_name)
	RETURNING process_registration_id INTO out_registration_id;

	INSERT INTO process_heartbeat_table (process_registration_id)
	VALUES (out_registration_id);

	RETURN out_registration_id;
END;
$$
LANGUAGE plpgsql;