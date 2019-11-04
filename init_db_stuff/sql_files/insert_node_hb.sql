-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION insert_node_hb(
	IN in_node_registration_id INTEGER
) RETURNS INTEGER AS $$
DECLARE out_heartbeat_id INTEGER;
BEGIN
	
	INSERT INTO node_heartbeat_table (node_registration_id)
	VALUES (in_node_registration_id) 
	RETURNING node_heartbeat_id INTO out_heartbeat_id;

	RETURN out_heartbeat_id;
END;
$$
LANGUAGE plpgsql;