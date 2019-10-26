-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION insert_process_hb(
	IN in_process_registration_id INTEGER
) RETURNS INTEGER AS $$
DECLARE out_heartbeat_id INTEGER;
BEGIN

	INSERT INTO process_heartbeat_table (process_registration_id)
	VALUES (in_process_registration_id) 
	RETURNING process_heartbeat_id INTO out_heartbeat_id;

	RETURN out_heartbeat_id;
END;
$$
LANGUAGE plpgsql;